import { RAGRequestSchema } from "../../../schemas/rag/ragRequestSchema";
import { z } from "zod";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ShortUniqueId from "short-unique-id";
import { ContentValidationError, validateInputContent } from "../../../scripts/contentValidator";
import { auth } from "auth";
import { getEndOfDay, getUserRequestInfo, tierLimits, updateUserRequestCount } from "utils/userDDBClient";
import { ipAddress } from "@vercel/functions";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { getAnonymousRequestCount, updateAnonymousRequestCount } from "utils/anonymousDDBClient";
import { Pinecone } from '@pinecone-database/pinecone';

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
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const uid = new ShortUniqueId({ length: 10 });

const pc = new Pinecone();
const pineconeIndex = pc.Index('boardally-rulebook-chunks');

type HitFields = {
    chunkText: string;
}

function log(request_id: string, message: string) {
    console.log({ "request_id": request_id, "message": message })
}

function getPrompt(userQuestion: string, rulebookChunks: string[]): string {
    return `
    Rulebook chunks: ${rulebookChunks.map(chunk => `\n      - ${chunk}`).join('')}
    User question: "${userQuestion}"
    Instruction: Provide a concise answer to the user's rules question, 
    referencing the provided chunks of text from the rulebook.`;
}

async function getTopKChunksFromPinecone(namespace: string, query: string, k: number): Promise<string[]> {
    const ns = pineconeIndex.namespace(namespace)
    return await ns.searchRecords({
        query: {
            topK: k,
            inputs: {
                text: query
            }
        }
    }).then(response => {
        const hits = response.result.hits
        return hits.map(hit => (hit.fields as HitFields).chunkText)
    });
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
            "selectedGame[name]": oldGameName,
            question
        } = RAGRequestSchema.parse(reqbody);

        const reqid = uid.rnd()

        const validation = validateInputContent(question)

        if (!validation.isValid) {
            throw new ContentValidationError(JSON.stringify(validation))
        }

        log(reqid, `Query: ${gameId} ${gameName} ${oldGameName}, ${question}`)
        
        const topChunks = await getTopKChunksFromPinecone(oldGameName, question, 10)
        log(reqid, `Got relevant chunks from Pinecone: ${topChunks.map(c => `${c.substring(0, 50)}...`)}`)

        const result = await model.generateContent([
            getPrompt(question, topChunks)
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
