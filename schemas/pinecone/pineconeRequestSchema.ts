import { z } from "zod";

export const PineconeRequestSchema = z.object({
  query: z.object({
    inputs: z.object({
      text: z.string()
    }),
    top_k: z.number().int()
  }),
  fields: z.array(z.string()),
});

export type PineconeRequest = z.infer<typeof PineconeRequestSchema>;
