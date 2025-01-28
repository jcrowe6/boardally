import { z } from "zod";

export const GenerationResponseSchema = z.object({
  response: z.string()
});

export type GenerationResponse = z.infer<typeof GenerationResponseSchema>;
