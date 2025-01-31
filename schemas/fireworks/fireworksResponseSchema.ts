import { z } from "zod";

export const FireworksResponseSchema = z.object({
  choices: z.array(z.object({
    finish_reason: z.string(),
    index: z.number().int(),
    message: z.object({
      role: z.string(),
      content: z.string().nullable()
    }),
  })),
  created: z.number().int(),
  id: z.string(),
  model: z.string(),
  object: z.string()
});

export type FireworksResponse = z.infer<typeof FireworksResponseSchema>;
