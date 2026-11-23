import { z } from "zod";
import { DesignNotes, Published } from "./scene.ts";

export const Demonstration = z.object({
  demo: z.literal(true),
  samples: z.array(z.object({
    label: z.string().min(1),
    designs: z.array(z.object({ portfolio: Published, baseline: Published.optional(), notes: DesignNotes })).length(2),
  })).min(2),
});
export type Demonstration = z.infer<typeof Demonstration>;
