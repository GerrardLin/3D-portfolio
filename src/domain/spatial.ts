import { Box3, Vector3 } from "three";
import { z } from "zod";

export const partForms = ["box", "disc", "dome", "ring", "arch", "wedge"] as const;
export const partFinishes = ["structure", "surface", "accent", "paper", "metal"] as const;
export const viewpoints = ["overhead", "oblique", "low"] as const;
export const PART_LIMIT = 6;
export const SCENERY_LIMIT = 14;

const metres = z.number().finite();
const coordinate = metres.min(-16).max(16);
const extent = metres.min(0.04).max(16);
const reference = z.string().trim().min(1).max(40);
export const Part = z.object({
  form: z.enum(partForms),
  at: z.tuple([coordinate, coordinate, coordinate]),
  size: z.tuple([extent, extent, extent]),
  yaw: metres.min(-180).max(180).optional(),
  finish: z.enum(partFinishes),
}).strict();

export const Assembly = z.array(Part).min(1).max(PART_LIMIT);
export const Space = z.object({
  name: z.string().trim().min(1).max(54),
  viewpoint: z.enum(viewpoints),
  scenery: z.array(Part).max(SCENERY_LIMIT),
  connections: z.array(z.tuple([reference, reference])).max(10),
}).strict();
export type Part = z.infer<typeof Part>;
export type SpaceSpec = z.infer<typeof Space>;

export function partBounds(part: Part, offset: [number, number] = [0, 0]) {
  const [x, y, z] = part.at;
  const [width, height, depth] = part.size;
  const yaw = (part.yaw ?? 0) * Math.PI / 180;
  const halfX = (Math.abs(Math.cos(yaw)) * width + Math.abs(Math.sin(yaw)) * depth) / 2;
  const halfZ = (Math.abs(Math.cos(yaw)) * depth + Math.abs(Math.sin(yaw)) * width) / 2;
  return new Box3(
    new Vector3(x + offset[0] - halfX, y - height / 2, z + offset[1] - halfZ),
    new Vector3(x + offset[0] + halfX, y + height / 2, z + offset[1] + halfZ),
  );
}

export function assemblyBounds(parts: Part[], offset: [number, number]) {
  return parts.reduce((bounds, part) => bounds.union(partBounds(part, offset)), new Box3());
}

export const sceneLimits = {
  width: 16,
  depth: 15,
  minY: -1.55,
  maxY: 5,
  assemblyWidth: 5.3,
  assemblyDepth: 4.5,
};

export function fitsSpace(bounds: Box3, floor: number) {
  return bounds.min.x >= -sceneLimits.width / 2 && bounds.max.x <= sceneLimits.width / 2 &&
    bounds.min.z >= -sceneLimits.depth / 2 && bounds.max.z <= sceneLimits.depth / 2 &&
    bounds.min.y >= floor - 0.0001 && bounds.max.y <= sceneLimits.maxY;
}

/** A link signifies two approved exhibits to explore together, without asserting causality or chronology. */
export function validConnections(connections: SpaceSpec["connections"], exhibitIds: Set<string>) {
  const seen = new Set<string>();
  return connections.filter(([a, b]) => {
    if (a === b || !exhibitIds.has(a) || !exhibitIds.has(b)) return false;
    const key = JSON.stringify([a, b].sort());
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
