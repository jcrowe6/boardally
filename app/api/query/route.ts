import { RAGRequestSchema } from "../../../schemas/rag/ragRequestSchema";
import { z } from "zod";
import { GoogleAIFileManager, FileMetadataResponse } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resumableUpload, ResumableUploadOptions } from "../../../scripts/resumableUploadForGoogleAPIs"
import { getBestRuleBook } from "../../../utils/rulebookDDBClient";
import { getSecureS3Url } from "../../../utils/s3client";
import ShortUniqueId from "short-unique-id";
import { ContentValidationError, validateInputContent } from "../../../scripts/contentValidator";
import { auth } from "auth";
import { getEndOfDay, getUserRequestInfo, updateUserRequestCount } from "utils/userDDBClient";

const getRequiredEnvVar = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not defined in environment variables`);
    }
    return value;
};

const requiredEnvVars = ['GEMINI_API_KEY', 'RESUMABLE_UPLOAD_URL'] as const;
const env = Object.fromEntries(
    requiredEnvVars.map(key => [key, getRequiredEnvVar(key)])
);

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const googleFileManager = new GoogleAIFileManager(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
    // Rate limiting for logged-in users
    if (session) {
        const userId = session.user?.id!!;
        const userInfo = await getUserRequestInfo(userId);
        console.log(`User ${userId} has ${userInfo.requestCount} requests today`)
        // Check if request count needs to be reset (new day)
        const now = new Date();
        const resetTime = new Date(userInfo.resetTimestamp);

        if (now.getTime() > resetTime.getTime()) {
            // Reset count for new day
            await updateUserRequestCount(userId, 1, getEndOfDay(now));
        } else {
            // Check if user has exceeded their daily limit
            const requestLimit = userInfo.tier === "paid" ? 100 : 10;

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
        const files = await googleFileManager.listFiles()

        let fileMetadata: FileMetadataResponse | undefined;

        if (files.files) {
            fileMetadata = files.files.find(fileObj => fileObj.displayName === gameId)
        }

        if (!fileMetadata) { // Upload file
            const { s3_key, file_size_in_bytes } = await getBestRuleBook(gameId)

            const s3Url = await getSecureS3Url(s3_key)

            const options: ResumableUploadOptions = {
                fileUrl: s3Url,
                resumableUrl: env.RESUMABLE_UPLOAD_URL,
                accessToken: env.GEMINI_API_KEY,
                dataSize: file_size_in_bytes,
                metadata: {
                    file: {
                        mimeType: "application/pdf",
                        displayName: gameId,
                    }
                }
            };

            const uploadResult = await resumableUpload(options)
            fileMetadata = uploadResult.file
        }

        const result = await model.generateContent([
            getPrompt(question),
            {
                fileData: {
                    fileUri: fileMetadata.uri,
                    mimeType: fileMetadata.mimeType,
                },
            },
        ]);

        const answer = result.response.text()
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
