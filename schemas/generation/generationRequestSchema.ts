import { z } from "zod";

export const GenerationRequestSchema = z.object({
  model: z.string(),
  stream: z.boolean(),
  prompt: z.string()
});

export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
