import { z } from "zod";

export const PineconeResponseSchema = z.object({
  result: z.object({
    hits: z.array(z.object({
      _id: z.string(),
      _score: z.number(),
      fields: z.object({
        text: z.string(),
        page_num: z.number().int()
      })
    }))
  })
});

export type PineconeResponse = z.infer<typeof PineconeResponseSchema>;
