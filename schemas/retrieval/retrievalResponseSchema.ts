import { z } from "zod";

export const RetrievalResponseSchema = z.object({
  documents: z.array(z.string())
});

export type RetrievalResponse = z.infer<typeof RetrievalResponseSchema>;
