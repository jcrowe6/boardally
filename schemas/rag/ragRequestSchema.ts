import { z } from "zod";

export const RAGRequestSchema = z.object({
  "question": z.string(),
  "selectedGame[display_name]": z.string(),
  "selectedGame[game_id]": z.string(),
  masterApiKey: z.string().optional()
});

export type RAGRequest = z.infer<typeof RAGRequestSchema>;
