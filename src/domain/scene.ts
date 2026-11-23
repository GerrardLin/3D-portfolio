import { Box3, PerspectiveCamera, Ray, Vector3 } from "three";
import { entrances } from "./direction.ts";
import { z } from "zod";
import { Entry, type PortfolioBrief, type CareerEntry } from "./profile.ts";
import { Assembly, Space, assemblyBounds, fitsSpace, partBounds, sceneLimits, validConnections } from "./spatial.ts";

export const layouts = ["showcase", "timeline"] as const;
export type Layout = typeof layouts[number];
export const layoutNames: Record<Layout, string> = { showcase: "Central showcase", timeline: "Career timeline" };
export const themes = {
  gallery: { label: "Forest pavilion", intent: "Portfolio with work across several disciplines", accent: "#dbec99", background: "#142019", floor: "#293a2b", panels: "#edf2de", grid: "#516652" },
  blueprint: { label: "Blueprint lab", intent: "Engineering, technical prototypes, and measured experiments", accent: "#85dcff", background: "#101d30", floor: "#243a54", panels: "#e7f5ff", grid: "#486582" },
  clay: { label: "Terracotta atelier", intent: "Human-centered design, field research, and community work", accent: "#ffbf94", background: "#32221f", floor: "#533a33", panels: "#fff0db", grid: "#885d4f" },
} as const;

export const components = {
  panel: { label: "Project panel", intent: "Present a project and its outcome", width: 2.8, height: 2.25, depth: 0.85 },
  plinth: { label: "Feature platform", intent: "Open the showcase with a substantial project or achievement", width: 3.2, height: 2.75, depth: 1.65 },
  marker: { label: "Milestone", intent: "Mark a role, transition, or dated project", width: 2.35, height: 1.85, depth: 1.1 },
  terminal: { label: "Technical console", intent: "Call out a pipeline, prototype, tool, or implemented system", width: 2.65, height: 2.08, depth: 1.15 },
  results: { label: "Evidence wall", intent: "Surface a recorded outcome, experiment, or evaluation", width: 2.7, height: 2.45, depth: 0.95 },
  skills: { label: "Skills rack", intent: "Present a documented set of tools, skills, or methods", width: 2.6, height: 1.95, depth: 0.95 },
} as const;

const ID = z.string().trim().min(1).max(40);
const coordinate = z.number().finite().min(-25).max(25);
const componentId = z.enum(Object.keys(components) as [keyof typeof components, ...(keyof typeof components)[]]);
export const DesignNotes = z.object({
  theme: z.object({ entryIds: z.array(ID).min(1).max(6), reason: z.string().trim().min(1).max(220) }),
  exhibits: z.array(z.object({ entryId: ID, reason: z.string().trim().min(1).max(160) })).max(6),
});
export type DesignNotes = z.infer<typeof DesignNotes>;

export const Exhibit = z.object({
  id: ID,
  entryId: ID,
  componentId,
  group: z.enum(["Featured", "Supporting", "Project", "Experience", "Skill", "Achievement"]),
  position: z.tuple([coordinate, coordinate]),
  cameraDistance: z.number().finite().min(0.5).max(25),
  visible: z.boolean(),
  assembly: Assembly.optional(),
});
export const Scene = z.object({
  version: z.literal(1),
  layout: z.enum(layouts),
  theme: z.enum(["gallery", "blueprint", "clay"]),
  entrance: z.enum(entrances).optional(),
  exhibits: z.array(Exhibit).min(1).max(6),
  route: z.array(ID).max(6),
  space: Space.optional(),
});
export type SceneSpec = z.infer<typeof Scene>;
export type ExhibitSpec = z.infer<typeof Exhibit>;
export const Published = z.object({
  version: z.literal(1),
  author: z.string().trim().min(1).max(80),
  entries: z.array(Entry).min(1).max(6),
  scene: Scene,
});
export type PublishedPortfolio = z.infer<typeof Published>;

export const FOV = 40;
export const MOBILE_ASPECT = 0.8;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 100;
export type Point3 = [number, number, number];

type CameraPose = { eye: Point3; target: Point3 };
export type StopCamera = CameraPose & { issue?: "framing" | "occlusion"; blocker?: string };

export function assemblyCamera(exhibit: ExhibitSpec, viewpoint: NonNullable<SceneSpec["space"]>["viewpoint"], aspect = MOBILE_ASPECT): StopCamera {
  const bounds = exhibitBox(exhibit);
  const center = bounds.getCenter(new Vector3());
  const extent = bounds.getSize(new Vector3());
  const [x, y, z] = center.toArray();
  const widthScale = Math.max(1, 1.12 / Math.max(aspect, MOBILE_ASPECT));
  const distance = Math.max(exhibit.cameraDistance * 0.68, Math.max(extent.x, extent.y, extent.z) * 1.65) * widthScale;
  const [side, lift, front] = viewpoint === "overhead" ? [0.16, 0.78, 0.67]
    : viewpoint === "low" ? [0.21, 0.34, 0.98] : [0.49, 0.57, 0.77];
  const target: Point3 = [x, y, z];
  let eye: Point3 = [x, y, z + distance];
  for (const multiplier of [1, 1.12, 1.28, 1.48, 1.75]) {
    const radius = distance * multiplier;
    eye = [x + radius * side, y + radius * lift, z + radius * front];
    if (isFramed(exhibit, { eye, target }, aspect)) return { eye, target };
  }
  return { eye, target, issue: "framing" };
}

export function signGeometry(exhibit: ExhibitSpec) {
  const { width, height } = components[exhibit.componentId];
  const signWidth = width - 0.22;
  const signHeight = signWidth * (430 / 768);
  return { width: signWidth, height: signHeight, y: height - signHeight / 2 - 0.05, z: 0.17 };
}

export function exhibitBox(exhibit: ExhibitSpec) {
  if (exhibit.assembly) return assemblyBounds(exhibit.assembly, exhibit.position);
  const [x, z] = exhibit.position;
  const { width, height, depth } = components[exhibit.componentId];
  return new Box3(
    new Vector3(x - width / 2, 0, z - depth / 2),
    new Vector3(x + width / 2, height, z + depth / 2),
  );
}

function findBlocker(exhibit: ExhibitSpec, eye: Point3, otherExhibits: ExhibitSpec[]) {
  const start = new Vector3(...eye);
  const [x, z] = exhibit.position;
  const sign = signGeometry(exhibit);
  const otherBoxes = otherExhibits.filter(other => other.visible && other.id !== exhibit.id)
    .map(other => ({ id: other.id, box: exhibitBox(other) }));
  // Test the center and edges of the actual sign, rather than just the camera target.
  for (const horizontal of [-0.46, 0, 0.46]) {
    for (const vertical of [-0.46, 0, 0.46]) {
      const end = new Vector3(x + sign.width * horizontal, sign.y + sign.height * vertical, z + sign.z);
      const direction = end.clone().sub(start);
      const length = direction.length();
      const ray = new Ray(start, direction.normalize());
      for (const { id, box } of otherBoxes) {
        if (box.containsPoint(start)) return id;
        const hit = ray.intersectBox(box, new Vector3());
        if (hit && hit.distanceTo(start) < length) return id;
      }
    }
  }
}

export function stopCamera(exhibit: ExhibitSpec, others: ExhibitSpec[] = []): StopCamera {
  const [x, z] = exhibit.position;
  const { height } = components[exhibit.componentId];
  const target: Point3 = [x, height * 0.54, z];
  const distance = exhibit.cameraDistance;
  const standard: CameraPose = { eye: [x, target[1] + 0.55, z + distance], target };
  let obstructed: StopCamera | undefined;
  for (const lift of [0.55, 1.8, 3.2, 4.7, 6.2]) {
    for (const angle of [0, -0.23, 0.23, -0.46, 0.46, -0.74, 0.74]) {
      const eye: Point3 = [x + Math.sin(angle) * distance, target[1] + lift, z + Math.cos(angle) * distance];
      const pose = { eye, target };
      if (!isFramed(exhibit, pose, MOBILE_ASPECT)) continue;
      const blocker = findBlocker(exhibit, eye, others);
      if (!blocker) return pose;
      obstructed ??= { ...pose, issue: "occlusion", blocker };
    }
  }
  return obstructed ?? { ...standard, issue: "framing" };
}

const showcaseSlots: [number, number][] = [[0, 1.55], [-3.65, -1.85], [3.65, -1.85], [-5.4, 1.4], [5.4, 1.4], [0, -3.8]];
const timelineSlots: [number, number][] = [[-5.35, 1.8], [-3.2, -2.65], [-0.95, 1.25], [1.3, -2.4], [3.6, 1.35], [5.55, -2.6]];

function relevance(entry: CareerEntry, audience: string) {
  const tokens = new Set(audience.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  const body = `${entry.title} ${entry.summary}`.toLowerCase();
  return [...tokens].filter(token => token.length > 1 && body.includes(token)).length;
}

function startYear(entry: CareerEntry) {
  return Number(`${entry.title} ${entry.summary}`.match(/(?:19|20)\d{2}(?!\d)/u)?.[0] ?? Infinity);
}

export function supportingComponent(entry: CareerEntry, layout: Layout): ExhibitSpec["componentId"] {
  if (entry.kind === "Skill") return "skills";
  if (entry.kind === "Experience") return "marker";
  if (entry.kind === "Achievement" || /\b(evaluat\w*|measure\w*|benchmark\w*|walkthroughs|survey)\b|评估|测试/u.test(entry.title.toLowerCase())) return "results";
  if (/\b(retrieval|pipeline|prototype|script|dashboard|automati\w*|model)\b|检索|模型/u.test((entry.title + " " + entry.summary).toLowerCase())) return "terminal";
  return layout === "timeline" && Number.isFinite(startYear(entry)) ? "marker" : "panel";
}

function adaptedTheme(brief: PortfolioBrief, layout: Layout): SceneSpec["theme"] {
  const text = `${brief.audience} ${brief.entries.map(entry => entry.title).join(" ")}`.toLowerCase();
  if (/\b(retrieval|ai|systems|software|data|sensor|engineering)\b|模型|数据/u.test(text)) return layout === "showcase" ? "blueprint" : "gallery";
  if (/\b(community|design|volunteer|research|service)\b|研究|志愿|产品/u.test(text)) return layout === "showcase" ? "clay" : "gallery";
  return layout === "showcase" ? "gallery" : "blueprint";
}

export function compose(brief: PortfolioBrief, layout: Layout, mode: "adapted" | "fixed" = "adapted"): SceneSpec {
  const { entries } = brief;
  const ordered = [...entries];
  if (mode === "adapted") {
    const order = layout === "showcase"
      ? ["Project", "Achievement", "Experience", "Skill"]
      : ["Experience", "Project", "Achievement", "Skill"];
    ordered.sort((a, b) =>
      (layout === "showcase" ? relevance(b, brief.audience) - relevance(a, brief.audience) : startYear(a) - startYear(b)) ||
      order.indexOf(a.kind) - order.indexOf(b.kind),
    );
  }
  const slots = layout === "showcase" ? showcaseSlots : timelineSlots;
  const exhibits: ExhibitSpec[] = ordered.slice(0, 6).map((entry, index) => ({
    id: `exhibit-${index + 1}`,
    entryId: entry.id,
    componentId: layout === "showcase" && index === 0 ? "plinth"
      : mode === "fixed" ? (layout === "timeline" ? "marker" : "panel") : supportingComponent(entry, layout),
    group: layout === "showcase" && index === 0 ? "Featured" : entry.kind,
    position: [...slots[index]],
    cameraDistance: 8.2,
    visible: true,
  }));
  return { version: 1, layout, theme: mode === "adapted" ? adaptedTheme(brief, layout) : layout === "showcase" ? "gallery" : "blueprint", exhibits, route: exhibits.map(({ id }) => id) };
}

export type SceneIssue = {
  code: "reference" | "overlap" | "out_of_bounds" | "unreachable" | "framing" | "occlusion" | "empty" | "structure" | "geometry" | "connection";
  exhibitId?: string;
  detail: string;
};

function isFramed(exhibit: ExhibitSpec, { eye, target }: CameraPose, aspect: number) {
  const camera = new PerspectiveCamera(FOV, aspect, CAMERA_NEAR, CAMERA_FAR);
  camera.position.set(...eye);
  camera.lookAt(...target);
  camera.updateMatrixWorld(true);
  const { min, max } = exhibitBox(exhibit);
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        const point = new Vector3(x, y, z).project(camera);
        if (Math.abs(point.x) > 0.94 || Math.abs(point.y) > 0.94 || Math.abs(point.z) > 1) return false;
      }
    }
  }
  return true;
}

function checkSpace(scene: SceneSpec): SceneIssue[] {
  if (!scene.space) return scene.exhibits.some(exhibit => exhibit.assembly)
    ? [{ code: "geometry", detail: "Define a space for the composed exhibits." }] : [];
  const visible = scene.exhibits.filter(exhibit => exhibit.visible);
  const ids = new Set(scene.exhibits.map(exhibit => exhibit.id));
  const issues: SceneIssue[] = [];
  if (validConnections(scene.space.connections, ids).length !== scene.space.connections.length) {
    issues.push({ code: "connection", detail: "Connect two different exhibit IDs at most once." });
  }
  for (const [index, part] of scene.space.scenery.entries()) {
    const bounds = partBounds(part);
    if (!fitsSpace(bounds, sceneLimits.minY)) {
      issues.push({ code: "geometry", detail: `Scenery part ${index + 1} extends beyond the space bounds.` });
    } else if (bounds.max.y > 0.0001 && visible.some(exhibit => bounds.intersectsBox(exhibitBox(exhibit)))) {
      issues.push({ code: "geometry", detail: `Scenery part ${index + 1} overlaps an exhibit.` });
    }
  }
  for (const exhibit of visible) {
    if (!exhibit.assembly) {
      issues.push({ code: "geometry", exhibitId: exhibit.id, detail: "Supply 1–6 geometry parts for this exhibit." });
      continue;
    }
    const bounds = exhibitBox(exhibit);
    const size = bounds.getSize(new Vector3());
    if (!fitsSpace(bounds, 0) || size.x > sceneLimits.assemblyWidth || size.z > sceneLimits.assemblyDepth) {
      issues.push({ code: "geometry", exhibitId: exhibit.id, detail: "Keep the object on or above the floor and within its size and space limits." });
    }
  }
  return issues;
}

export function checkScene(scene: SceneSpec, entries: CareerEntry[]): SceneIssue[] {
  const issues: SceneIssue[] = checkSpace(scene);
  const visible = scene.exhibits.filter(exhibit => exhibit.visible);
  const known = new Set(entries.map(({ id }) => id));
  const visibleIds = new Set(visible.map(({ id }) => id));
  const routeIds = new Set(scene.route);
  const usedEntries = new Set<string>();
  const usedExhibits = new Set<string>();
  if (!visible.length) issues.push({ code: "empty", detail: "Show at least one exhibit." });
  for (const id of scene.route) {
    if (!visibleIds.has(id)) issues.push({ code: "unreachable", exhibitId: id, detail: "A route stop has no visible exhibit." });
  }
  if (routeIds.size !== scene.route.length) issues.push({ code: "unreachable", detail: "The route repeats an exhibit." });
  for (const exhibit of scene.exhibits) {
    const { id, entryId, position: [x, z], componentId } = exhibit;
    const { width, depth } = components[componentId];
    if (!known.has(entryId) || usedEntries.has(entryId) || usedExhibits.has(id)) {
      issues.push({ code: "reference", exhibitId: id, detail: "Use a unique exhibit ID and a unique approved entry." });
    }
    usedEntries.add(entryId);
    usedExhibits.add(id);
    if (!exhibit.visible) continue;
    if (!routeIds.has(id)) issues.push({ code: "unreachable", exhibitId: id, detail: "This exhibit is missing from the guided route." });
    if (!scene.space && (Math.abs(x) + width / 2 > 7 || Math.abs(z) + depth / 2 > 6)) {
      issues.push({ code: "out_of_bounds", exhibitId: id, detail: "The exhibit extends beyond the gallery floor." });
    }
    const stop = scene.space ? assemblyCamera(exhibit, scene.space.viewpoint) : stopCamera(exhibit, visible);
    if (stop.issue === "framing") {
      issues.push({ code: "framing", exhibitId: id, detail: "Mobile framing clips this exhibit. Increase camera distance or use a smaller component." });
    } else if (stop.issue === "occlusion") {
      issues.push({
        code: "occlusion", exhibitId: id,
        detail: `A clear camera angle for ${id} is blocked by ${stop.blocker}. Stagger the displays or widen the spacing.`,
      });
    }
  }
  visible.forEach((a, index) => {
    const bounds = exhibitBox(a).expandByScalar(0.06);
    for (const b of visible.slice(index + 1)) {
      const other = exhibitBox(b).expandByScalar(0.06);
      if (bounds.intersectsBox(other)) {
        issues.push({ code: "overlap", exhibitId: b.id, detail: `Overlaps ${a.id}. Move one of the exhibits.` });
      }
    }
  });
  return issues;
}

export function makePublished(brief: PortfolioBrief, scene: SceneSpec): PublishedPortfolio {
  const validated = Scene.parse(scene);
  const issues = checkScene(validated, brief.entries);
  if (issues.length) throw new Error(issues[0].detail);
  const exhibits = validated.exhibits.filter(({ visible }) => visible);
  const publishedIds = new Set(exhibits.map(({ entryId }) => entryId));
  const space = validated.space && {
    ...validated.space, connections: validConnections(validated.space.connections, new Set(exhibits.map(exhibit => exhibit.id))),
  };
  return Published.parse({
    version: 1,
    author: brief.author,
    entries: brief.entries.filter(({ id }) => publishedIds.has(id)),
    scene: { ...validated, exhibits, space },
  });
}
