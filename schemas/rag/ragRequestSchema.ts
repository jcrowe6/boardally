import { z } from "zod";

export const RAGRequestSchema = z.object({
  game: z.string(),
  question: z.string(),
});

export type RAGRequest = z.infer<typeof RAGRequestSchema>;
