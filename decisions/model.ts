import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const line = (max: number) => text(max).min(1);
const link = z.string().trim().max(500).url().regex(/^https?:\/\//u);
export const Sources = z.array(z.object({ label: line(100), url: link })).max(3);

export const activityLabels = {
  investigate: "线索调查",
  priority: "优先级排序",
  compare: "原型对比",
} as const;

const comparison = (field: typeof text) => z.object({
  label: field(55), observation: field(200),
});
const activity = (field: typeof text) => z.discriminatedUnion("type", [
  z.object({ type: z.literal("investigate") }),
  z.object({ type: z.literal("priority"), constraint: field(180) }),
  z.object({ type: z.literal("compare"), aspect: field(100), views: z.tuple([comparison(field), comparison(field)]) }),
]);

const fields = (field: typeof text) => ({
  title: field(100),
  context: field(420),
  question: field(220),
  options: z.array(field(92)).min(2).max(3),
  clues: z.array(z.object({ label: field(65), text: field(320) })).min(1).max(3),
  reveal: field(620),
  takeaway: field(210),
  activity: activity(field).optional(),
  feedback: z.array(z.object({ text: field(220), clue: z.number().int().min(0).max(2).optional() })).max(3).optional(),
  role: field(140).optional(),
  outcome: field(180).optional(),
});

export const EditableDraft = z.object(fields(text));
export type Draft = z.infer<typeof EditableDraft>;

export const CaseContent = z.object(fields(line));
export const PublicCase = CaseContent.extend({
  id: line(40),
  kind: z.enum(["record", "web", "evidence"]),
  author: line(80),
  sources: Sources,
  profile: z.object({
    headline: line(105).optional(),
    link: z.object({ label: line(100), url: link }).optional(),
  }).optional(),
}).superRefine((value, context) => {
  const errors = checkActivity(value);
  for (const message of errors) context.addIssue({ code: "custom", message });
});
export type PublicCase = z.infer<typeof PublicCase>;

export function checkActivity(draft: Draft) {
  const errors: string[] = [];
  if (new Set(draft.options.map(option => option.toLowerCase())).size !== draft.options.length) {
    errors.push("请填写彼此不同的选择。");
  }
  if (draft.feedback && (draft.feedback.length !== draft.options.length ||
      draft.feedback.some(item => item.clue !== undefined && item.clue >= draft.clues.length))) {
    errors.push("每个选择需要一条反馈，引用的线索必须存在。");
  }
  if (draft.activity?.type === "compare" &&
      draft.activity.views[0].label.toLowerCase() === draft.activity.views[1].label.toLowerCase()) {
    errors.push("请为两个对比对象填写不同的名称。");
  }
  return errors;
}

export const Interview = z.object({
  author: line(80),
  résumé: line(16000),
  story: text(5000),
  candidate: line(140).optional(),
  followup: line(240).optional(),
});
export type InterviewInput = z.infer<typeof Interview>;

const evidenceSource = z.enum(["résumé", "story"]);

export const Recommendations = z.object({
  status: z.literal("recommendations"),
  candidates: z.array(z.object({
    title: line(140),
    reason: line(220),
    question: line(240),
    source: evidenceSource,
    quote: line(600),
  })).min(1).max(2),
});
export type Recommendations = z.infer<typeof Recommendations>;

export const Editorial = z.discriminatedUnion("status", [
  z.object({ status: z.literal("question"), question: line(240) }),
  z.object({
    status: z.literal("draft"),
    case: CaseContent,
    evidence: z.array(z.object({
      field: z.enum(["context", "clue-1", "clue-2", "clue-3", "reveal", "role", "outcome", "constraint", "comparison-1", "comparison-2"]),
      source: evidenceSource,
      quote: line(600),
    })).min(3).max(10),
  }),
]);
export type Editorial = z.infer<typeof Editorial>;

const normalize = (value: string) => value.replace(/\s+/gu, " ").trim();

export function matchingQuote(binding: { source: "résumé" | "story"; quote: string }, input: InterviewInput) {
  return normalize(input[binding.source]).includes(normalize(binding.quote));
}

export function checkEditorial(result: Editorial, input: InterviewInput) {
  if (result.status === "question") return [];
  const draft = result.case;
  const expected = ["context", ...draft.clues.map((_, index) => "clue-" + (index + 1)), "reveal"];
  if (draft.role) expected.push("role");
  if (draft.outcome) expected.push("outcome");
  if (draft.activity?.type === "priority") expected.push("constraint");
  if (draft.activity?.type === "compare") expected.push("comparison-1", "comparison-2");
  const errors = checkActivity(draft);
  for (const field of expected) {
    const binding = result.evidence.find(item => item.field === field);
    if (!binding || !matchingQuote(binding, input)) errors.push("An exact supporting excerpt is missing for " + field);
  }
  if (result.evidence.length !== expected.length) errors.push("Bind each factual field exactly once.");
  return errors;
}
