import type { NextApiRequest, NextApiResponse } from "next";
import type { RAGResponse } from "../../interfaces";

// Fake answer
const answer: RAGResponse = {answer: "I don't know!"};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RAGResponse>,
) {
  const { query, method } = req;
  if (method != "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${method} Not Allowed`);
    return;
  }
  
  res.status(200).json(answer)
  //let retrieval_response = await fetch("http://localhost:8001/query")
}
