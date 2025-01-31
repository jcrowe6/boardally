import { z } from "zod";

export const FireworksRequestSchema = z.object({
  model: z.string(),
  max_tokens: z.number().int().optional(),
  top_p: z.number().optional(),
  top_k: z.number().int().optional(),
  presence_penalty: z.number().optional(),
  frequency_penalty: z.number().optional(),
  temperature: z.number().optional(),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string()
  }))
});

export type FireworksRequest = z.infer<typeof FireworksRequestSchema>;
