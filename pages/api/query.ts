import type { NextApiRequest, NextApiResponse } from "next";
import { RAGResponse } from "../../schemas/rag/ragResponseSchema";
import { RetrievalRequest, RetrievalRequestSchema } from "../../schemas/retrieval/retrievalRequestSchema";
import { RAGRequestSchema } from "../../schemas/rag/ragRequestSchema";
import { z } from "zod";
import { RetrievalResponseSchema } from "../../schemas/retrieval/retrievalResponseSchema";

// Fake answer
const answer: RAGResponse = {answer: "I don't know!"};

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
    const valid_request = RAGRequestSchema.parse(req.body);

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

    const validatedResponse = RetrievalResponseSchema.parse(retrieval_data);
    
    const response: RAGResponse = {
      answer: validatedResponse.documents[0]
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
