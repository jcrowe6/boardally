import { z } from "zod";

export const RAGRequestSchema = z.object({
  "question": z.string(),
  "selectedGame[displayName]": z.string(),
  "selectedGame[gameId]": z.string()
});

export type RAGRequest = z.infer<typeof RAGRequestSchema>;
