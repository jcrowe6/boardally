import { z } from "zod";

export const RAGRequestSchema = z.object({
  gameId: z.string(),
  question: z.string(),
});

export type RAGRequest = z.infer<typeof RAGRequestSchema>;
