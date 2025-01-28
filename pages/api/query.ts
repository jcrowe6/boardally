import type { NextApiRequest, NextApiResponse } from "next";
import { RAGResponse } from "../../schemas/rag/ragResponseSchema";
import { RetrievalRequest, RetrievalRequestSchema } from "../../schemas/retrieval/retrievalRequestSchema";
import { RAGRequestSchema } from "../../schemas/rag/ragRequestSchema";
import { z } from "zod";
import { RetrievalResponseSchema } from "../../schemas/retrieval/retrievalResponseSchema";
import { GenerationRequest } from "../../schemas/generation/generationRequestSchema";
import { GenerationResponseSchema } from "../../schemas/generation/generationResponseSchema";

// Fake answer
function get_prompt(question: string, documents: string[]): string {
  return `Rulebook lines:\n${documents.join("\n")}\n
          User question: "${question}"
          Instruction:
          Provide a short answer to the user's rules question, referencing the rulebook lines above. Don't preface it.`;
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

  try {
    // Validate request
    const valid_request = RAGRequestSchema.parse(req.body);

    // Call Retrieval service
    const retr_req: RetrievalRequest = {
      game: valid_request["game"],
      question: valid_request["question"]
    }

    const retrieval_response = await fetch('http://localhost:8000/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(retr_req),
    })
    
    if (!retrieval_response.ok) {
      console.error("Error from retrieval service:", retrieval_response.statusText);
      res.status(502).json({ answer: "Error querying retrieval service" });
      return;
    }

    const retrieval_data = await retrieval_response.json()

    const valid_retr_response = RetrievalResponseSchema.parse(retrieval_data);
    
    // Construct prompt and call generation service
    const prompt = get_prompt(valid_request.question, valid_retr_response.documents)
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
