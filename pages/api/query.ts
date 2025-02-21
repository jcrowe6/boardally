import type { NextApiRequest, NextApiResponse } from "next";
import { RAGResponse } from "../../schemas/rag/ragResponseSchema";
import { RAGRequestSchema } from "../../schemas/rag/ragRequestSchema";
import { z } from "zod";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resumableUpload } from "../../scripts/resumableUploadForGoogleAPIs"
import { getBestRuleBookKey } from "../../utils/dynamoDBclient";

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
    const valid_request = RAGRequestSchema.parse(req.body);
    
    // Get best rulebook S3 key
    const rbkey = await getBestRuleBookKey(valid_request.game)

    // Check if already in google files
    let files = await googleFileManager.listFiles()
    console.log(files)
    

    // Todo: upload if not in google files, get file ref, prompt gemini with file ref

    // const object = {
    //   fileUrl: s3Url,
    //   filePath: "",
    //   accessToken: "",
    //   resumableUrl: `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key=${env.GEMINI_API_KEY}`,
    //   dataSize: 7300541,
    //   metadata: { 
    //     file: {
    //       mimeType: "application/pdf",
    //       displayName: "Sky Team",
    //     }
    //   }
    // };
    // const uploadResult = await resumableUpload(object).catch((err) =>
    //   console.log(err)
    // );

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
