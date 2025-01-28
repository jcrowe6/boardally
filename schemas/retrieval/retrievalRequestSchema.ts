import { z } from "zod";

export const RetrievalRequestSchema = z.object({
  game: z.string(),
  question: z.string(),
});

export type RetrievalRequest = z.infer<typeof RetrievalRequestSchema>;
