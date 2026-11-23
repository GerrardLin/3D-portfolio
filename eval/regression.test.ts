import assert from "node:assert/strict";
import { test } from "node:test";
import { unzipSync, strFromU8 } from "fflate";
import { attemptDesign, designOne, extract } from "../server/agent.ts";
import { Scene, checkScene, compose, layouts, makePublished, stopCamera, type ExhibitSpec } from "../src/domain/scene.ts";
import { htmlPortfolio, viewerFiles, zipPortfolio } from "../src/domain/export.ts";
import { approvedBrief, syntheticProfile } from "../src/domain/profile.ts";
import { localExhibition, makeDemo } from "../src/domain/preparedDesigns.ts";
import { cases } from "./fixtures.ts";
import { walkMap } from "../src/domain/walk.ts";
import { exhibitBox } from "../src/domain/scene.ts";

test("walking routes reach every demo stop without crossing an exhibit footprint", () => {
  for (const sample of makeDemo().samples) for (const {portfolio} of sample.designs) {
    const exhibits = portfolio.scene.exhibits;
    const map = walkMap(exhibits);
    let start = map.entrance;
    for (const exhibit of exhibits) {
      const bounds = exhibitBox(exhibit);
      const destination: [number, number] = [(bounds.max.x + bounds.min.x)/2, bounds.max.z + .85];
      const path = map.route(start, destination);
      assert.deepEqual(path[0], start);
      const end = path.at(-1)!;
      assert.ok(Math.hypot(end[0]-destination[0],end[1]-destination[1]) < 1);
      for (const [index, [x,z]] of path.entries()) {
        if(index) assert.ok(Math.hypot(path[index-1][0]-x,path[index-1][1]-z) <= .51);
        assert.ok(exhibits.every(other => {
          const box = exhibitBox(other).expandByScalar(.39);
          return x<box.min.x || x>box.max.x || z<box.min.z || z>box.max.z;
        }));
      }
      start = end;
    }
  }
});

const sample = syntheticProfile();
const brief = approvedBrief(sample.author, "Applied AI hiring team", sample.entries);

test("portable exhibit designs retain approved entries and produce valid geometry across profiles", () => {
  const spaces = new Set<string>();
  for (const { brief } of cases) for (const layout of ["showcase", "timeline"] as const) {
    const { scene, design } = localExhibition(brief, layout);
    assert.deepEqual(checkScene(scene, brief.entries), []);
    const published = makePublished(brief, scene);
    assert.ok(published.scene.exhibits.every(exhibit => exhibit.assembly?.length));
    assert.ok(design.theme.entryIds.every(id => published.entries.some(entry => entry.id === id)));
    spaces.add(scene.space!.name);
  }
  assert.ok(spaces.size >= 4);
});

test("single-file public data round trips HTML-like text without ending its data block", () => {
  const data = makePublished(brief, compose(brief, "showcase"));
  data.author = '许安宁 </ScRiPt> <!-- $&';
  const strings = ['<html><head><script type="module" src="./assets/viewer.js"></script><link rel="stylesheet" href="./assets/viewer.css"></head><body></body></html>', 'const label = "$&";', 'body { margin: 0 }'];
  const assets = Object.fromEntries(viewerFiles.map((path, index) => [path, new TextEncoder().encode(strings[index])]));
  const html = htmlPortfolio(data, assets);
  const payload = html.match(/id="exhibit-public-data" type="application\/json">(.*?)<\/script>/su)?.[1];
  assert.deepEqual(JSON.parse(payload!), JSON.parse(JSON.stringify(data)));
  assert.ok(!/src="|href="|sourceId|studio-viewer-files/u.test(html));
  assert.ok(html.includes(strings[1]));
});

test("fixed and locally composed scenes are valid for all held-out inputs", () => {
  for (const item of cases) for (const layout of layouts) {
    assert.deepEqual(checkScene(compose(item.brief, layout, "fixed"), item.brief.entries), []);
    assert.deepEqual(checkScene(compose(item.brief, layout), item.brief.entries), []);
  }
});

test("checker detects overlap, mobile clipping, out-of-bounds placement and unreachable stops", () => {
  const scene = compose(brief, "showcase");
  scene.exhibits[1].position = [...scene.exhibits[0].position];
  scene.exhibits[0].cameraDistance = 0.7;
  scene.exhibits[2].position = [15, 0];
  scene.route[3] = "missing";
  const codes = new Set(checkScene(scene, brief.entries).map(issue => issue.code));
  for (const code of ["overlap", "framing", "out_of_bounds", "unreachable"] as const) assert.ok(codes.has(code));
});

test("revision receives actual checker results and is tried once", async () => {
  const corrected = makeDemo().samples[0].designs[0].portfolio.scene;
  const clipped = structuredClone(corrected);
  clipped.exhibits[0].assembly![0].at[0] = 12;
  const attempts: unknown[] = [];
  const result = await designOne(brief, "showcase", async (_prompt, payload) => {
    attempts.push(payload);
    return attempts.length === 1 ? clipped : corrected;
  });
  assert.equal(result.origin, "revised");
  assert.equal(attempts.length, 2);
  assert.match(JSON.stringify(attempts[1]), /checkerFeedback.*geometry/u);
  assert.ok(result.scene.space);
  assert.deepEqual(result.scene.exhibits[0].assembly, corrected.exhibits[0].assembly);
  assert.deepEqual(result.attempts[1].issues, []);
  const fallback = await designOne(brief, "showcase", async () => clipped);
  assert.equal(fallback.origin, "fallback");
  assert.equal(fallback.attempts.length, 2);
  assert.deepEqual(checkScene(fallback.scene, brief.entries), []);
});

test("malformed or wrong-layout plans are unusable", async () => {
  const attempt = await attemptDesign(brief, "showcase", async () => compose(brief, "timeline"));
  assert.equal(attempt.outcome, "invalid_output");
  assert.equal(attempt.scene, undefined);
});

test("AI extraction requires source matches and returns pending facts", async () => {
  const source = sample.sources[0];
  const entries = await extract(sample.sources, async () => ({
    entries: [
      { kind: "Project", title: "Atlas", summary: "Built a tutoring prototype.", sourceId: source.id, quote: "Built a tutoring prototype" },
      { kind: "Project", title: "Unknown", summary: "A fact", sourceId: source.id, quote: "No such quote" },
    ],
  }));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].approved, false);
  assert.equal(entries[0].quote, "Built a tutoring prototype");
});

test("export retains edited route and public text while excluding hidden and private data", () => {
  const scene = compose(brief, "showcase");
  scene.exhibits[0].visible = false;
  scene.route = scene.route.slice(1).reverse();
  const published = makePublished(brief, scene);
  assert.deepEqual(published.scene.route, scene.route);
  assert.equal(published.entries.length, scene.route.length);
  const files = Object.fromEntries(viewerFiles.map(path => [path, new Uint8Array([1, 2, 3])]));
  const zip = unzipSync(zipPortfolio(published, files));
  assert.deepEqual(Object.keys(zip).sort(), [...viewerFiles, "portfolio.json"].sort());
  const data = strFromU8(zip["portfolio.json"]);
  assert.doesNotMatch(data, /sourceId|approved|quote|audience/u);
  assert.ok(!published.entries.some(entry => entry.id === scene.exhibits[0].entryId));
});


test("camera finds a clear angle for the original blocked stop and reports an unrecoverable obstruction", () => {
  const scene = compose(brief, "showcase");
  const rear: ExhibitSpec = { ...scene.exhibits[1], position: [3.8, -2.2], componentId: "panel" };
  const front: ExhibitSpec = { ...scene.exhibits[2], position: [3.8, 1.1], componentId: "panel" };
  assert.notDeepEqual(stopCamera(rear).eye, stopCamera(rear, [front]).eye);
  assert.equal(stopCamera(rear, [front]).issue, undefined);

  const low: ExhibitSpec = { ...rear, position: [0, -0.96], componentId: "marker" };
  const tall: ExhibitSpec = { ...front, position: [0, 0.6], componentId: "plinth" };
  const blocked = { ...scene, exhibits: [low, tall], route: [low.id, tall.id] };
  assert.equal(stopCamera(low, [tall]).blocker, tall.id);
  assert.ok(checkScene(blocked, brief.entries).some(issue => issue.code === "occlusion" && issue.exhibitId === low.id));
});

test("demo uses the same approved facts within a sample and distinct resume-driven palettes and elements", () => {
  const [technical, community] = makeDemo().samples;
  const [showcase, timeline] = technical.designs.map(item => item.portfolio);
  assert.deepEqual(showcase.entries, timeline.entries);
  assert.notDeepEqual(showcase.scene.route.map(id => showcase.scene.exhibits.find(exhibit => exhibit.id === id)?.entryId),
    timeline.scene.route.map(id => timeline.scene.exhibits.find(exhibit => exhibit.id === id)?.entryId));
  assert.equal(showcase.scene.theme, "blueprint");
  assert.equal(community.designs[0].portfolio.scene.theme, "clay");
  assert.ok(showcase.scene.exhibits.some(exhibit => exhibit.componentId === "terminal"));
  assert.ok(community.designs[0].portfolio.scene.exhibits.every(exhibit => exhibit.componentId !== "terminal"));
});


test("checked composed geometry uses bounded parts and approved links, and export discards hidden links", () => {
  const { portfolio, baseline } = makeDemo().samples[0].designs[0];
  assert.ok(baseline);
  assert.deepEqual(portfolio.entries, baseline.entries);
  assert.deepEqual(portfolio.scene.route, baseline.scene.route);
  assert.ok(Scene.safeParse(baseline.scene).success);

  const scene = structuredClone(portfolio.scene);
  assert.ok(scene.space);
  const [first, second] = scene.exhibits;
  assert.ok(first.assembly);
  assert.equal(Scene.safeParse({ ...scene, space: { ...scene.space, javascript: "render()" } }).success, false);
  const bad = structuredClone(scene);
  bad.exhibits[0].assembly![0].size[0] = 17;
  assert.equal(Scene.safeParse(bad).success, false);

  scene.space.connections.push([first.id, "unknown"]);
  assert.ok(checkScene(scene, portfolio.entries).some(issue => issue.code === "connection"));
  scene.space.connections.pop();

  first.visible = false;
  scene.route = scene.route.filter(id => id !== first.id);
  const result = makePublished(brief, scene);
  assert.equal(result.entries.some(entry => entry.id === first.entryId), false);
  assert.equal(result.scene.space?.connections.some(pair => pair.includes(first.id)), false);
  assert.ok(result.scene.exhibits.find(item => item.id === second.id)?.assembly);
});

test("composed technical and community exhibits differ in viewpoint, floor geometry and symbol geometry", () => {
  const [technical, community] = makeDemo().samples.map(sample => sample.designs[0].portfolio.scene);
  assert.equal(technical.space?.viewpoint, "oblique");
  assert.equal(community.space?.viewpoint, "overhead");
  assert.notDeepEqual(technical.space?.scenery.map(part => part.form), community.space?.scenery.map(part => part.form));
  assert.notDeepEqual(technical.exhibits.map(exhibit => exhibit.position), community.exhibits.map(exhibit => exhibit.position));
  assert.ok(technical.exhibits[0].assembly?.some(part => part.form === "ring"));
  assert.ok(community.exhibits[0].assembly?.some(part => part.form === "dome"));
});

test('editorial choice requires an entry in the selected route; keep valid plans when ranking fails',async()=>{
  const {recommend}=await import('../server/recommend.ts');const candidates=layouts.map(layout=>({...localExhibition(brief,layout),origin:'model' as const,attempts:[]}));const entryId=candidates[1].scene.exhibits[0].entryId;
  const real=await recommend(brief,candidates,async()=>({layout:'timeline',entryId,reason:'Show work in sequence.'}));assert.equal(real.by,'model');assert.equal(real.layout,'timeline');
  const invalid=await recommend(brief,candidates,async()=>({layout:'timeline',entryId:'absent',reason:'x'}));assert.equal(invalid.by,'rule');assert.ok(candidates.find(c=>c.scene.layout===invalid.layout)?.scene.exhibits.some(e=>e.entryId===invalid.entryId));
});

test('visitor direction follows demonstrated work over incidental skills and survives both checked layouts',()=>{
 const wanted:Record<string,string>={'finance':'evidence-desk','systems-engineering':'logic-board','community-ops':'field-atlas','bilingual-product':'field-atlas'};
 for(const item of cases.filter(c=>c.id in wanted))for(const layout of layouts){const scene=localExhibition(item.brief,layout).scene;assert.equal(makePublished(item.brief,scene).scene.entrance,wanted[item.id]);}
});

test("interactive portfolio requires an excerpt for each comparison and rejects orphan feedback links", async () => {
  const { Editorial, checkEditorial } = await import("../decisions/model.ts");
  const story = "I led testing. A stalled. B continued. I shipped B.";
  const output = Editorial.parse({
    status: "draft",
    case: {
      title: "Selecting a prototype", context: "I worked on the pilot", role: "Led testing",
      question: "What would you ship?", options: ["A", "B"], clues: [{ label: "Trace", text: "A stalled" }],
      reveal: "I shipped B", takeaway: "Check both in the same environment",
      activity: { type: "compare", aspect: "Same input", views: [
        { label: "A", observation: "A stalled" }, { label: "B", observation: "B continued" },
      ] },
      feedback: [{ text: "Check the trace", clue: 0 }, { text: "Repeat on a different input", clue: 0 }],
    },
    evidence: [
      { field: "context", source: "résumé", quote: "worked on the pilot" },
      { field: "role", source: "story", quote: "led testing" },
      { field: "clue-1", source: "story", quote: "A stalled" },
      { field: "reveal", source: "story", quote: "shipped B" },
      { field: "comparison-1", source: "story", quote: "A stalled" },
      { field: "comparison-2", source: "story", quote: "B continued" },
    ],
  });
  assert.equal(output.status, "draft");
  const input = { author: "Author", résumé: "I worked on the pilot", story };
  assert.deepEqual(checkEditorial(output, input), []);
  output.evidence[5].quote = "A claim absent from the materials";
  output.case.feedback![0].clue = 2;
  const errors = checkEditorial(output, input);
  assert.ok(errors.some(error => error.includes("comparison-2")));
  assert.ok(errors.some(error => error.includes("引用的线索必须存在")));
});

test("personal site exports only public case data and escapes sharing metadata", async () => {
  const { originalCases } = await import("../decisions/cases.ts");
  const { renderVisitor } = await import("../decisions/publicHtml.ts");
  const shell = "<title>换你来做</title><!-- public-metadata --><!-- public-case -->";
  const source = {
    ...originalCases[0], title: '</title><script>bad()</script>',
    résumé: "unused-private-input", story: "unused-private-interview",
  };
  const output = renderVisitor(shell, source, {
    url: "https://example.org/page?one=1&two=2", image: "javascript:bad()",
  });
  assert.ok(output.includes("&lt;/title&gt;&lt;script&gt;"));
  assert.ok(output.includes("one=1&amp;two=2"));
  assert.ok(!output.includes("unused-private"));
  assert.ok(!output.includes("javascript:bad()"));
  const embedded = output.match(/<script id="public-case" type="application\/json">(.*?)<\/script>/s)?.[1];
  assert.equal(JSON.parse(embedded!).title, source.title);
});
