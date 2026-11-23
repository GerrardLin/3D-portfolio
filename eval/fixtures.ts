import { approvedBrief, localExtraction, parsePages } from "../src/domain/profile.ts";

const records = [
  {
    id: "water-systems",
    author: "Riley Seo",
    audience: "Environmental data and geospatial monitoring",
    key: [2, 3],
    source: `Skills — Python, QGIS, and field sampling.

Neighbourhood heat map, 2026 — Combined 120 temperature readings with tree canopy data to publish a heat map for a field methods class.

Stormwater sensor lab, 2025 — Calibrated a depth sensor and built a Python script to flag missing readings.

Park volunteer, 2024 — Recorded soil and plant observations on a public trail survey.`,
  },
  {
    id: "design-research",
    author: "Toni Reyes",
    audience: "UX research and digital accessibility",
    key: [2, 4],
    source: `Library desk experience, 2024 — Answered circulation questions and maintained the reservation log.

Accessible catalogue prototype, 2026 — Redesigned a catalogue flow and ran five screen-reader walkthroughs.

Skills — Interviewing, Figma, WCAG auditing, and thematic analysis.

Transit diary study, 2025 — Conducted eight diary interviews and coded barriers faced on unfamiliar bus routes.`,
  },
  {
    id: "systems-engineering",
    author: "Jordan Okafor",
    audience: "Software reliability and systems engineering",
    key: [3, 4],
    source: `Skills — Go, PostgreSQL, OpenTelemetry, and GitHub Actions.

Faculty scholarship, 2024 — Awarded a departmental scholarship for academic performance.

Queue reliability project, 2026 — Added idempotency keys and measured retry failures under injected timeouts.

Platform intern, 2025 — Added latency dashboards and documented a rollback procedure for a staging service.

Campus meal planner, 2025 — Built a mobile-friendly meal planner for an elective course.

Volunteer experience, 2023 — Scheduled student mentors for weekly tutoring sessions.

Poster presentation, 2024 — Presented a course poster on cache policies.`,
  },
  {
    id: "finance",
    author: "Sasha Lim",
    audience: "Research analyst and financial modelling",
    key: [2, 3],
    source: `Skills — Spreadsheet modelling, Python, presentation design.

Airline research project, 2026 — Built a scenario model for changes in fuel prices and compared operating margins across three airlines.

Treasury intern, 2025 — Reconciled cash statements and documented exceptions before the weekly review.

Photography society experience, 2024 — Coordinated a campus exhibition and catalogued submissions.`,
  },
  {
    id: "community-ops",
    author: "Robin Ahmed",
    audience: "Community programme operations and service delivery",
    key: [2, 4],
    source: `Skills — Survey design, spreadsheet reporting, and scheduling.

Community pantry volunteer, 2025 — Coordinated four weekly shifts and prepared sign-up instructions for new volunteers.

Campus gardening workshop, 2024 — Helped arrange a one-day event for a student society.

Referral map project, 2026 — Mapped five local agencies and checked referral information with the programme coordinator.`,
  },
  {
    id: "bilingual-product",
    author: "许安宁",
    audience: "产品分析、用户研究",
    key: [2, 3],
    source: `技能：SQL、Figma、流程图和访谈笔记整理。

校园预约项目（2026）：访谈六位同学并整理预约失败的常见原因，参与重写错误提示。

产品实习（2025）：整理试用反馈和验收清单，跟踪三项待核实的问题。

迎新志愿者（2024）：维护签到表并安排轮换。`,
  },
];

export const cases = records.map(({ id, author, audience, key, source }) => {
  const extracted = localExtraction(parsePages([source])).map(entry => ({ ...entry, approved: true }));
  return { id, keyEntries: key.map(n => `entry-${n}`), brief: approvedBrief(author, audience, extracted) };
});
