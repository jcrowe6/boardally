import { z } from "zod";
import { HitSchema } from "./fieldSchema";

export const PineconeResponseSchema = z.object({
  result: z.object({
    hits: z.array(HitSchema)
  })
});

export type PineconeResponse = z.infer<typeof PineconeResponseSchema>;
