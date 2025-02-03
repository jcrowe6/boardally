import { z } from "zod";

export const HitSchema = z.object({
    _id: z.string(),
    _score: z.number(),
    fields: z.object({
        text: z.string(),
        page_num: z.number().int()
    })
});

export type Hit = z.infer<typeof HitSchema>;
