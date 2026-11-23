import { z } from "zod";

export const kinds = ["Project", "Experience", "Skill", "Achievement"] as const;
export const MAX_SOURCE_LENGTH = 24_000;
const shortText = (max: number) => z.string().trim().min(1).max(max);
export const Source = z.object({
  id: shortText(40),
  page: z.number().int().positive(),
  text: shortText(MAX_SOURCE_LENGTH),
});
export const Entry = z.object({
  id: shortText(40),
  kind: z.enum(kinds),
  title: shortText(80),
  summary: shortText(360),
});
export const ReviewedEntry = Entry.extend({
  sourceId: shortText(40),
  quote: shortText(MAX_SOURCE_LENGTH),
  approved: z.boolean(),
});
export const Brief = z.object({
  author: shortText(80),
  audience: z.string().trim().max(160),
  entries: z.array(Entry).min(1).max(30),
}).superRefine(({ entries }, ctx) => {
  if (new Set(entries.map(({ id }) => id)).size !== entries.length) {
    ctx.addIssue({ code: "custom", path: ["entries"], message: "Entry IDs must be unique." });
  }
});
export type SourceBlock = z.infer<typeof Source>;
export type EntryKind = typeof kinds[number];
export type CareerEntry = z.infer<typeof Entry>;
export type ReviewEntry = z.infer<typeof ReviewedEntry>;
export type PortfolioBrief = z.infer<typeof Brief>;

export const normalizeSource = (text: string) => text.replace(/\s+/gu, " ").trim();

export function parsePages(pages: string[]): SourceBlock[] {
  const blocks = pages.flatMap((text, index) =>
    text.split(/\r?\n\s*\r?\n/u).map(normalizeSource).filter(Boolean).map((block, part) => ({
      id: `p${index + 1}-b${part + 1}`, page: index + 1, text: block,
    })),
  );
  if (!blocks.length) throw new Error("No text was found. For a scanned résumé, paste its text.");
  if (blocks.length > 150 || blocks.reduce((sum, block) => sum + block.text.length, 0) > MAX_SOURCE_LENGTH) {
    throw new Error("Use a résumé with at most 24,000 characters and 150 text blocks.");
  }
  return blocks;
}

function inferKind(text: string): EntryKind {
  if (/^(skills?|technical skills|technologies|技能)\b|^技能/iu.test(text)) return "Skill";
  if (/\b(award|scholarship|certification|won)\b|奖项/iu.test(text)) return "Achievement";
  if (/\b(intern|internship|volunteer|employment|experience)\b|实习|工作经历/iu.test(text)) return "Experience";
  return "Project";
}

export function localExtraction(sources: SourceBlock[]): ReviewEntry[] {
  return sources.slice(0, 30).map((source, index) => {
    const [heading, ...details] = source.text.split(/\s+(?:—|–|\|)\s+|[:：]\s*/u);
    return {
      id: `entry-${index + 1}`,
      kind: inferKind(source.text),
      title: heading.slice(0, 80).trim() || `Entry ${index + 1}`,
      summary: (details.join(" — ") || source.text).slice(0, 360).trim(),
      sourceId: source.id,
      quote: source.text,
      approved: false,
    };
  });
}

export function approvedBrief(author: string, audience: string, entries: ReviewEntry[]): PortfolioBrief {
  return Brief.parse({
    author: author.trim() || "Portfolio",
    audience,
    entries: entries.filter(({ approved }) => approved),
  });
}

export const syntheticPages = [`Atlas · AI Tutoring Assistant — Built a tutoring prototype that retrieves lesson passages and cites them in responses.

Retrieval pipeline — Implemented hybrid retrieval over a lesson corpus and exposed supporting passages in the tutor interface.

Evaluation harness — Created a 40-question evaluation set and tracked citation coverage and answer relevance.

Learning Lab Internship — Ran prototype walkthroughs, consolidated feedback, and translated issues into a prioritized backlog.

Skills — Python, TypeScript, React, information retrieval, and evaluation design.`];

export function syntheticProfile() {
  const sources = parsePages(syntheticPages);
  return {
    author: "Maya Chen",
    sources,
    entries: localExtraction(sources).map(entry => ({ ...entry, approved: true })),
  };
}
