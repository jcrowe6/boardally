import type { NextApiRequest, NextApiResponse } from "next";
import { RAGResponse } from "../../schemas/rag/ragResponseSchema";
import { RAGRequestSchema } from "../../schemas/rag/ragRequestSchema";
import { z } from "zod";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resumableUpload, ResumableUploadOptions } from "../../scripts/resumableUploadForGoogleAPIs"
import { getBestRuleBook } from "../../utils/dynamoDBclient";
import { getSecureS3Url } from "../../utils/s3client";

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RAGResponse>,
) {
  if (req.method != "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    // Validate request
    const { game, question } = RAGRequestSchema.parse(req.body);

    // Check if already in google files
    const files = await googleFileManager.listFiles()

    const names = files.files ? files.files.map((file) => file.displayName) : []
    
    const inFiles = names.includes(game)
    
    // Upload file
    if (!inFiles) {
      const { s3_key, file_size_in_bytes } = await getBestRuleBook(game)

      const s3Url = await getSecureS3Url(s3_key)

      const options: ResumableUploadOptions = {
        fileUrl: s3Url,
        resumableUrl: env.RESUMABLE_UPLOAD_URL,
        accessToken: env.GEMINI_API_KEY,
        dataSize: file_size_in_bytes,
        metadata: { 
          file: {
            mimeType: "application/pdf",
            displayName: game,
          }
        }
      };
      
      const uploadResult = await resumableUpload(options);
      console.log(uploadResult)
    }

    

    // // The below script is from https://ai.google.dev/api/files#video
    // let file = await googleFileManager.getFile(uploadResult.file.name);
    // while (file.state === FileState.PROCESSING) {
    //   process.stdout.write(".");
    //   // Sleep for 10 seconds
    //   await new Promise((resolve) => setTimeout(resolve, 10_000));
    //   // Fetch the file from the API again
    //   file = await googleFileManager.getFile(uploadResult.file.name);
    // }

    // if (file.state === FileState.FAILED) {
    //   throw new Error("PDF processing failed.");
    // }

    // // View the response.
    // console.log(
    //   `Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`
    // );

    // const result = await model.generateContent([
    //   "Tell me about this document.",
    //   {
    //     fileData: {
    //       fileUri: uploadResult.file.uri,
    //       mimeType: uploadResult.file.mimeType,
    //     },
    //   },
    // ]);

    res.status(200).json({answer: "foo"})

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return res.status(400).json({ answer: "Invalid data format" });
    }

    console.error("Error in handler:", error);
    res.status(500).json({ answer: "Internal server error" });
  }
}
