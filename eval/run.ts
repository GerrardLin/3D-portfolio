import { mkdir, writeFile } from "node:fs/promises";
import { checkCandidate, attemptDesign, signatures, type Attempt } from "../server/agent.ts";
import { createModel, modelConfig } from "../server/model.ts";
import { compose, layouts, type SceneSpec } from "../src/domain/scene.ts";
import { cases } from "./fixtures.ts";

const fixedOnly = process.argv.includes("--fixed-only");
const config = modelConfig(process.env);
if (!config && !fixedOnly) {
  console.error("Set MODEL_BASE_URL, MODEL_NAME, and MODEL_API_KEY for the comparison, or pass --fixed-only for the fixed baseline.");
  process.exit(1);
}
const callModel = !fixedOnly && config ? createModel(config) : undefined;

type Result = {
  caseId: string;
  layout: string;
  method: "fixed" | "single" | "revision";
  valid: boolean;
  validBeforeFallback: boolean;
  elapsedMs: number;
  calls: number;
  violations: string[];
  keyEntriesTop3: number | null;
  approvedBindings: boolean;
  scene?: SceneSpec;
  attempts?: Attempt[];
};
const rows: Result[] = [];
for (const { id, brief, keyEntries } of cases) {
  for (const layout of layouts) {
    const started = performance.now();
    const fixed = compose(brief, layout, "fixed");
    const fixedIssues = checkCandidate(fixed, brief.entries);
    const getResult = (method: Result["method"], attempt: Attempt, calls: number, attempts?: Attempt[]): Result => {
      const scene = attempt.scene;
      const hasApprovedBindings = scene?.exhibits.every(exhibit => brief.entries.some(entry => entry.id === exhibit.entryId));
      const valid = !!scene && attempt.issues.length === 0;
      const top3 = scene?.route.slice(0, 3).map(stop => scene.exhibits.find(item => item.id === stop)?.entryId);
      return {
        caseId: id, layout, method, valid, validBeforeFallback: valid,
        elapsedMs: Number(attempt.ms.toFixed(2)), calls,
        violations: attempt.issues.map(issue => issue.code),
        keyEntriesTop3: top3 ? keyEntries.filter(entryId => top3.includes(entryId)).length : null,
        approvedBindings: hasApprovedBindings ?? false,
        scene, attempts,
      };
    };
    rows.push(getResult("fixed", { scene: fixed, issues: fixedIssues, ms: performance.now() - started, outcome: "checked" }, 0));
    if (callModel) {
      const first = await attemptDesign(brief, layout, callModel);
      rows.push(getResult("single", first, 1, [first]));
      const revised = first.issues.length && first.outcome !== "gateway_error"
        ? await attemptDesign(brief, layout, callModel, first) : undefined;
      rows.push(revised ? getResult("revision", { ...revised, ms: first.ms + revised.ms }, 2, [first, revised])
        : getResult("revision", first, 1, [first]));
    }
    console.log(`${id} · ${layout} complete`);
  }
}

const methods = [...new Set(rows.map(row => row.method))];
const aggregates = methods.map(method => {
  const records = rows.filter(row => row.method === method);
  const bound = records.filter(row => row.keyEntriesTop3 !== null);
  const distinct = cases.map(({ id }) => {
    const [a, b] = records.filter(row => row.caseId === id && row.scene);
    if (!a?.scene || !b?.scene) return null;
    const c = signatures(a.scene);
    const d = signatures(b.scene);
    return c.grouping !== d.grouping || c.route !== d.route;
  });
  const geometryDistinct = cases.map(({ id }) => {
    const [a, b] = records.filter(row => row.caseId === id && row.scene);
    return a?.scene && b?.scene ? signatures(a.scene).geometry !== signatures(b.scene).geometry : null;
  });
  const violations: Record<string, number> = {};
  for (const record of records) for (const code of record.violations) violations[code] = (violations[code] ?? 0) + 1;
  return {
    method, candidates: records.length, validBeforeFallback: records.filter(row => row.valid).length,
    averageMs: Number((records.reduce((sum, row) => sum + row.elapsedMs, 0) / records.length).toFixed(2)),
    modelCalls: records.reduce((sum, row) => sum + row.calls, 0),
    keyHits: bound.reduce((sum, row) => sum + (row.keyEntriesTop3 ?? 0), 0),
    keyHitDenominator: bound.length * 2,
    approvedBindings: records.filter(row => row.approvedBindings).length,
    distinctPairs: distinct.filter(Boolean).length,
    comparablePairs: distinct.filter(value => value !== null).length,
    distinctGeometryPairs: geometryDistinct.filter(value => value === true).length,
    violations,
  };
});

await mkdir("artifacts", { recursive: true });
const resultPath = callModel ? "artifacts/evaluation.json" : "artifacts/fixed-baseline.json";
await writeFile(resultPath, JSON.stringify({ model: callModel ? config?.model : null, cases: cases.length, aggregates, rows }, null, 2) + "\n");
console.table(aggregates.map(({ violations, ...record }) => record));
console.log(resultPath);
