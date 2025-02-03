import type { NextApiRequest, NextApiResponse } from "next";
import { RAGResponse } from "../../schemas/rag/ragResponseSchema";
import { RAGRequestSchema } from "../../schemas/rag/ragRequestSchema";
import { z } from "zod";
import { PineconeRequest } from "../../schemas/pinecone/pineconeRequestSchema";
import { PineconeResponse, PineconeResponseSchema } from "../../schemas/pinecone/pineconeResponseSchema";
import { FireworksRequest } from "../../schemas/fireworks/fireworksRequestSchema";
import { FireworksResponseSchema } from "../../schemas/fireworks/fireworksResponseSchema";
import { Hit } from "../../schemas/pinecone/fieldSchema";

const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not defined in environment variables`);
  }
  return value;
};

const get_prompt = (question: string, hits: Hit[]): string => {
  const ref_texts = hits.map((hit) => `[Page ${hit.fields.page_num}]\n${hit.fields.text}`)
  return `Rulebook pages:\n${ref_texts.join("\n")}\n\n
          User question: "${question}"
          Instruction:
          Provide a concise answer to the user's rules question, \
          referencing the rulebook pages. \
          If the answer cannot be determined from the rules, say "I'm sorry, I can't determine the answer to your question". \
          Be sure to cite the page(s) you used.`;
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

  const requiredEnvVars = ['PINECONE_HOST', 'PINECONE_API_KEY', 'FIREWORKS_HOST', 'FIREWORKS_API_KEY', 'FIREWORKS_MODEL'] as const;
  const env = Object.fromEntries(
    requiredEnvVars.map(key => [key, getRequiredEnvVar(key)])
  );

  try {
    // Validate request
    const valid_request = RAGRequestSchema.parse(req.body);

    // Call Retrieval service
    const retr_req: PineconeRequest = {
      query: {
        inputs: {
          text: valid_request["question"]
        },
        filter: {
          chunk_type: "page"
        },
        top_k: 3
      },
      fields: ["text", "page_num"]
    }
    
    const pc_uri = `${env.PINECONE_HOST}/records/namespaces/${valid_request["game"]}/search`
    const retrieval_response = await fetch(pc_uri, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Api-Key': env.PINECONE_API_KEY, 
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
    
    // Construct prompt and call generation service
    const prompt = get_prompt(valid_request.question, valid_retr_response.result.hits)
    console.log(prompt)
    const gen_req: FireworksRequest = {
      model: env.FIREWORKS_MODEL,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    }

    const gen_response = await fetch(`${env.FIREWORKS_HOST}/inference/v1/chat/completions`, {
      method: 'POST',
      headers: {
        "Accept": "application/json",
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${env.FIREWORKS_API_KEY}`
      },
      body: JSON.stringify(gen_req),
    })
    
    if (!gen_response.ok) {
      console.error("Error from generation service:", gen_response.statusText);
      res.status(502).json({ answer: "Error querying generation service" });
      return;
    }

    const gen_data = await gen_response.json()

    const valid_gen_response = FireworksResponseSchema.parse(gen_data);

    const answer = valid_gen_response.choices[0].message.content
    if (!answer) {
      console.error("Generation returned null content");
      res.status(502).json({ answer: "Error querying generation service" });
      return;
    }

    // Return answer to user
    const response: RAGResponse = {
      answer: answer
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
