import { RAGResponse } from "../../../schemas/rag/ragResponseSchema";
import { RAGRequestSchema } from "../../../schemas/rag/ragRequestSchema";
import { z } from "zod";
import { GoogleAIFileManager, FileState, FileMetadataResponse } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resumableUpload, ResumableUploadOptions } from "../../../scripts/resumableUploadForGoogleAPIs"
import { getBestRuleBook } from "../../../utils/dynamoDBclient";
import { getSecureS3Url } from "../../../utils/s3client";
import { NextRequest, NextResponse } from "next/server";

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

function getPrompt(userQuestion: string) {
  return `User question: "${userQuestion}"
          Instruction: Provide a concise answer to the user's rules question, 
          referencing the provided rulebook. Cite which section or sections 
          you used to determine the answer.`;
}

export async function POST( req: NextRequest ): Promise<NextResponse | undefined> {
  try {
    const body = await req.json()

    // Validate request
    const { "selectedGame[gameId]": gameId, question } = RAGRequestSchema.parse(body);

    // Check if already in google files
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

    return NextResponse.json({answer: result.response.text()}, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json({ answer: "Invalid data format" }, { status: 400 });
    }

    console.error("Error in handler:", error);
    NextResponse.json({ answer: "Internal server error" }, { status: 500 });
  }
}
