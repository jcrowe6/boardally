import type { NextApiRequest, NextApiResponse } from "next";
import { RAGResponse } from "../../schemas/rag/ragResponseSchema";
import { RetrievalRequest, RetrievalRequestSchema } from "../../schemas/retrieval/retrievalRequestSchema";
import { RAGRequestSchema } from "../../schemas/rag/ragRequestSchema";
import { z } from "zod";
import { RetrievalResponseSchema } from "../../schemas/retrieval/retrievalResponseSchema";
import { GenerationRequest } from "../../schemas/generation/generationRequestSchema";
import { GenerationResponseSchema } from "../../schemas/generation/generationResponseSchema";
import { PineconeRequest } from "../../schemas/pinecone/pineconeRequestSchema";
import { PineconeResponseSchema } from "../../schemas/pinecone/pineconeResponseSchema";

// Fake answer
function get_prompt(question: string, documents: string[]): string {
  return `Rulebook lines:\n${documents.join("\n")}\n
          User question: "${question}"
          Instruction:
          Provide a short answer to the user's rules question, referencing the rulebook lines above. If the answer cannot be determined from the rules, say so. Don't preface it.`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RAGResponse>,
) {
  if (req.method != "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  if (!process.env.PINECONE_HOST) {
    throw new Error('PINECONE_HOST is not defined in environment variables');
  }

  if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY is not defined in environment variables');
  }

  try {
    // Validate request
    const valid_request = RAGRequestSchema.parse(req.body);

    // Call Retrieval service
    const retr_req: PineconeRequest = {
      query: {
        inputs: {
          text: valid_request["question"]
        },
        top_k: 10
      },
      fields: ["text", "page_num"]
    }
    
    const pc_uri = `${process.env.PINECONE_HOST}/records/namespaces/${valid_request["game"]}/search`
    const retrieval_response = await fetch(pc_uri, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Api-Key': process.env.PINECONE_API_KEY, 
        'X-Pinecone-API-Version': 'unstable'
      },
      body: JSON.stringify(retr_req),
    })
    
    if (!retrieval_response.ok) {
      console.error("Error from retrieval service:", retrieval_response.statusText);
      res.status(502).json({ answer: "Error querying retrieval service" });
      return;
    }

    const retrieval_data = await retrieval_response.json()

    const valid_retr_response = PineconeResponseSchema.parse(retrieval_data);
    
    const docs: string[] = valid_retr_response.result.hits.map((hit) => hit.fields.text)

    // Construct prompt and call generation service
    const prompt = get_prompt(valid_request.question, docs)
    console.log(prompt)
    const gen_req: GenerationRequest = {
      model: "llama3.1",
      stream: false,
      prompt: prompt
    }

    const gen_response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gen_req),
    })
    
    if (!gen_response.ok) {
      console.error("Error from generation service:", gen_response.statusText);
      res.status(502).json({ answer: "Error querying generation service" });
      return;
    }

    const gen_data = await gen_response.json()

    const valid_gen_response = GenerationResponseSchema.parse(gen_data);

    // Return answer to user
    const response: RAGResponse = {
      answer: valid_gen_response.response
    }

    res.status(200).json(response)

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return res.status(400).json({ answer: "Invalid data format" });
    }

    console.error("Error in handler:", error);
    res.status(500).json({ answer: "Internal server error" });
  }
}
