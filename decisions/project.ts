import { z } from "zod";
import { EditableDraft, Editorial, Recommendations } from "./model.ts";

export const storageKey = "your-turn-author-project-v1";
export const Project = z.object({
  version: z.literal(1),
  author: z.string().max(80),
  résumé: z.string().max(16000),
  story: z.string().max(5000),
  headline: z.string().max(105),
  link: z.string().max(500),
  linkLabel: z.string().max(100),
  sources: z.array(z.object({ label: z.string().max(100), url: z.string().max(500) })).max(3),
  draft: EditableDraft,
  candidates: Recommendations.shape.candidates.optional(),
  candidate: z.string().max(140).optional(),
  followup: z.string().max(240).optional(),
  review: Editorial.optional(),
});
export type Project = z.infer<typeof Project>;

export function blankProject(): Project {
  return {
    version: 1, author: "", résumé: "", story: "", headline: "", link: "", linkLabel: "", sources: [],
    draft: {
      title: "", context: "", question: "", options: ["", ""], clues: [{ label: "", text: "" }],
      reveal: "", takeaway: "", role: "", outcome: "", activity: { type: "investigate" },
      feedback: [{ text: "" }, { text: "" }],
    },
  };
}

export function loadProject(): Project {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) return Project.parse(JSON.parse(stored));
  } catch {
    // A backup can still be imported if storage is unavailable or corrupted.
  }
  return blankProject();
}
