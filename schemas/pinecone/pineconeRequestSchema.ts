import { z } from "zod";

export const PineconeRequestSchema = z.object({
  query: z.object({
    inputs: z.object({
      text: z.string()
    }),
    filter: z.object({}).optional(),
    top_k: z.number().int()
  }),
  fields: z.array(z.string()),
});

export type PineconeRequest = z.infer<typeof PineconeRequestSchema>;
