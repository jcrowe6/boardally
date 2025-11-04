import { z } from "zod";

export const RAGResponseSchema = z.object({
  answer: z.string(),
});

export type RAGResponse = z.infer<typeof RAGResponseSchema>;
