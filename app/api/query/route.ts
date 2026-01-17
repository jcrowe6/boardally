import { RAGRequestSchema } from "../../../schemas/rag/ragRequestSchema";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { getBestRuleBook } from "../../../utils/rulebookDDBClient";
import { getSecureS3Url } from "../../../utils/s3client";
import ShortUniqueId from "short-unique-id";
import { ContentValidationError, validateInputContent } from "../../../scripts/contentValidator";
import { auth } from "auth";
import { getEndOfDay, getUserRequestInfo, tierLimits, updateUserRequestCount } from "utils/userDDBClient";
import { ipAddress } from "@vercel/functions";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { getAnonymousRequestCount, updateAnonymousRequestCount } from "utils/anonymousDDBClient";

const getRequiredEnvVar = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not defined in environment variables`);
    }
    return value;
};

const requiredEnvVars = ['GEMINI_API_KEY'] as const;
const env = Object.fromEntries(
    requiredEnvVars.map(key => [key, getRequiredEnvVar(key)])
);

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const uid = new ShortUniqueId({ length: 10 });

function log(request_id: string, message: string) {
    console.log({ "request_id": request_id, "message": message })
}

function getPrompt(userQuestion: string) {
    return `User question: "${userQuestion}"
          Instruction: Provide a concise answer to the user's rules question,
          referencing the provided rulebook. Cite which section or sections
          you used to determine the answer.`;
}

async function waitForFileActive(ai: GoogleGenAI, fileName: string, reqid: string, maxAttempts = 60): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
        const fileInfo = await ai.files.get({ name: fileName });

        if (fileInfo.state === "ACTIVE") {
            log(reqid, `File ${fileName} is now ACTIVE`);
            return;
        }

        if (fileInfo.state === "FAILED") {
            throw new Error(`File processing failed for ${fileName}`);
        }

        log(reqid, `File ${fileName} is ${fileInfo.state}, waiting...`);
        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(`File processing timeout for ${fileName}`);
}

export async function POST(req: Request): Promise<Response | undefined> {
    const session = await auth()
    // Rate limiting for logged-in users
    if (session) {
        const userId = session.user?.id!!;
        const userInfo = await getUserRequestInfo(userId);
        console.log(`User ${userId} has ${userInfo.requestCount} requests today`)
        // Check if request count needs to be reset (new day)
        const now = new Date();
        const resetTime = new Date(userInfo.resetTimestamp);

        // This logic is what actually resets the user's request count on a new day
        // TODO consider moving this elsewhere?
        if (now.getTime() > resetTime.getTime()) {
            // Reset count for new day
            await updateUserRequestCount(userId, 1, getEndOfDay(now));
        } else {
            // Check if user has exceeded their daily limit
            const requestLimit = tierLimits[userInfo.tier]

            if (userInfo.requestCount >= requestLimit) {
                console.log(`User ${userId} hit their daily limit`)
                const response = new Response(JSON.stringify({ answer: "Daily request limit reached" }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 429
                });
                return response
            }

            // Increment request count
            await updateUserRequestCount(userId, userInfo.requestCount + 1, resetTime);
        }
    } else {
        const clientIp = ipAddress(req)
        const cookieStore = await cookies()
        let anonymousId = cookieStore.get('anonymousId')?.value
        if (!anonymousId) {
            anonymousId = nanoid();
            cookieStore.set('anonymousId', anonymousId)
        }
        const anonKey = `${clientIp}:${anonymousId}`

        const anonInfo = await getAnonymousRequestCount(anonKey);

        // Reset logic - similar to authenticated users
        const now = new Date();
        const resetTime = new Date(anonInfo.resetTimestamp);

        if (now.getTime() > resetTime.getTime()) {
            await updateAnonymousRequestCount(anonKey, 1, getEndOfDay(now));
        } else {
            const anonLimit = 1; 

            if (anonInfo.requestCount >= anonLimit) {
                console.log(`Anon ${anonKey} hit their daily limit`)
                const response = new Response(JSON.stringify({ answer: "Daily request limit reached" }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 429
                });
                return response
            }

            await updateAnonymousRequestCount(anonKey, anonInfo.requestCount + 1, resetTime);
        }

    }
    try {
        const reqbody = await req.json()

        // Validate request
        const {
            "selectedGame[game_id]": gameId,
            "selectedGame[display_name]": gameName,
            question
        } = RAGRequestSchema.parse(reqbody);

        const reqid = uid.rnd()

        const validation = validateInputContent(question)

        if (!validation.isValid) {
            throw new ContentValidationError(JSON.stringify(validation))
        }

        log(reqid, `Query: ${gameName}, ${question}`)

        // Check if already in google files
        // TODO: CACHE, with lower TTL
        const filesPager = await ai.files.list()

        let fileMetadata = filesPager.page.find(file => file.displayName === gameId);

        if (!fileMetadata) { // Upload file
            const { s3_key, file_size_in_bytes } = await getBestRuleBook(gameId)

            const s3Url = await getSecureS3Url(s3_key)

            log(reqid, `Uploading file: ${s3_key}, reported size: ${file_size_in_bytes} bytes`)

            // Fetch the file from S3
            const response = await fetch(s3Url);
            const fileBlob = await response.blob();

            // Upload using the new SDK
            fileMetadata = await ai.files.upload({
                file: fileBlob,
                config: {
                    mimeType: "application/pdf",
                    displayName: gameId,
                }
            });

            // Wait for the file to be processed
            if (!fileMetadata.name) {
                throw new Error(`File upload failed: no name returned for ${gameId}`);
            }
            await waitForFileActive(ai, fileMetadata.name, reqid);
        } else {
            // Even cached files might still be processing, so check the state
            log(reqid, `Found cached file: ${fileMetadata.name}, checking state...`);
            if (!fileMetadata.name) {
                throw new Error(`Cached file has no name for ${gameId}`);
            }
            await waitForFileActive(ai, fileMetadata.name, reqid);
        }

        const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: getPrompt(question) },
                        {
                            fileData: {
                                fileUri: fileMetadata.uri,
                                mimeType: fileMetadata.mimeType,
                            },
                        },
                    ],
                },
            ],
        });

        const answer = result.text
        log(reqid, `Answer: ${answer}`)
        const response = new Response(JSON.stringify({ answer: answer }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });
        return response
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Zod validation error:", error.errors);
            const response = new Response(JSON.stringify({ answer: "Invalid data format" }), {
                headers: { 'Content-Type': 'application/json' },
                status: 400
            });
            return response
        }

        if (error instanceof ContentValidationError) {
            console.error("Content validation error:", error.message);
            const response = new Response(JSON.stringify({ answer: "Invalid content" }), {
                headers: { 'Content-Type': 'application/json' },
                status: 422
            });
            return response
        }

        console.error("Error in handler:", error);
        const response = new Response(JSON.stringify({ answer: "Internal server error" }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
        return response
    }
}
