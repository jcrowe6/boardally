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

export async function POST(req: Request): Promise<Response | undefined> {
    const session = await auth()

    // Variables to track user/anon info for incrementing after success
    let userId: string | null = null;
    let userInfo: { requestCount: number; resetTimestamp: number; tier: string } | null = null;
    let anonKey: string | null = null;
    let anonInfo: { anonKey: string; requestCount: number; resetTimestamp: number; ttl: number } | null = null;

    // Rate limiting for logged-in users
    if (session) {
        userId = session.user?.id!!;
        userInfo = await getUserRequestInfo(userId);
        console.log(`User ${userId} has ${userInfo.requestCount} requests today`)

        // Check if request count needs to be reset (new day)
        const now = new Date();
        const resetTime = new Date(userInfo.resetTimestamp);

        if (now.getTime() > resetTime.getTime()) {
            // Will reset and set to 1 after successful response
            userInfo = { ...userInfo, requestCount: 0, resetTimestamp: getEndOfDay(now).getTime() };
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
        }
    } else {
        const clientIp = ipAddress(req)
        const cookieStore = await cookies()
        let anonymousId = cookieStore.get('anonymousId')?.value
        if (!anonymousId) {
            anonymousId = nanoid();
            cookieStore.set('anonymousId', anonymousId)
        }
        anonKey = `${clientIp}:${anonymousId}`

        const fetchedAnonInfo = await getAnonymousRequestCount(anonKey);

        // Reset logic - similar to authenticated users
        const now = new Date();
        const resetTime = new Date(fetchedAnonInfo.requestCount !== undefined ? fetchedAnonInfo.resetTimestamp : 0);

        if (now.getTime() > resetTime.getTime()) {
            // Will reset and set to 1 after successful response
            anonInfo = {
                anonKey,
                requestCount: 0,
                resetTimestamp: getEndOfDay(now).getTime(),
                ttl: fetchedAnonInfo.ttl || Math.floor(Date.now() / 1000) + 60 * 60 * 24
            };
        } else {
            const anonLimit = 1;

            if (fetchedAnonInfo.requestCount >= anonLimit) {
                console.log(`Anon ${anonKey} hit their daily limit`)
                const response = new Response(JSON.stringify({ answer: "Daily request limit reached" }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 429
                });
                return response
            }

            anonInfo = fetchedAnonInfo as { anonKey: string; requestCount: number; resetTimestamp: number; ttl: number };
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

        // Get the S3 pre-signed URL for the PDF
        const { s3_key, file_size_in_bytes } = await getBestRuleBook(gameId)
        const s3Url = await getSecureS3Url(s3_key)

        log(reqid, `Fetching file from S3: ${s3_key}, reported size: ${file_size_in_bytes} bytes`)

        // Fetch the PDF from S3 and convert to base64 for inline data
        // Use 'omit' credentials to avoid Vercel adding Authorization headers
        const pdfResponse = await fetch(s3Url, {
            method: 'GET',
            credentials: 'omit',
            headers: {
                // Don't add any extra headers - pre-signed URL has auth in query params
            },
        });

        if (!pdfResponse.ok) {
            const errorText = await pdfResponse.text().catch(() => 'Unable to read error body');
            log(reqid, `S3 fetch failed: ${pdfResponse.status} ${pdfResponse.statusText} - ${errorText}`);
            throw new Error(`Failed to fetch PDF from S3: ${pdfResponse.status} ${pdfResponse.statusText}`);
        }

        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

        log(reqid, `PDF fetched successfully, size: ${pdfBuffer.byteLength} bytes`)

        // Use inline data approach (supports PDFs up to 50MB)
        const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: getPrompt(question) },
                        {
                            inlineData: {
                                mimeType: "application/pdf",
                                data: pdfBase64,
                            },
                        },
                    ],
                },
            ],
        });

        const answer = result.text
        log(reqid, `Answer: ${answer}`)

        // Increment request count only on successful response
        if (userId && userInfo) {
            await updateUserRequestCount(userId, userInfo.requestCount + 1, new Date(userInfo.resetTimestamp));
        } else if (anonKey && anonInfo) {
            await updateAnonymousRequestCount(anonKey, anonInfo.requestCount + 1, new Date(anonInfo.resetTimestamp));
        }

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
