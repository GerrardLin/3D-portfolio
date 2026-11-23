import { exhibitBox, type ExhibitSpec } from "./scene.ts";

export type Tile = [number, number];
const width = 35, depth = 31, spacing = 0.5;
const point = (key: number): Tile => [(key % width - 17) * spacing, (Math.floor(key / width) - 15) * spacing];
const distance = (a: Tile, b: Tile) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function walkMap(exhibits: ExhibitSpec[]) {
  const obstacles = exhibits.filter(item => item.visible).map(item => exhibitBox(item).expandByScalar(0.4));
  const tiles = Array.from({ length: width * depth }, (_, key) => point(key));
  const allowed = tiles.map(([x, z]) => !obstacles.some(box => x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z));
  const closest = (target: Tile) => tiles.reduce((best, tile, key) =>
    allowed[key] && (best < 0 || distance(tile, target) < distance(tiles[best], target)) ? key : best, -1);
  const entrance = closest([0, 6.5]);
  function route(start: Tile, end: Tile): Tile[] {
    const origin = closest(start);
    if (origin < 0) return [];
    const queue = [origin];
    const parent = new Map([[origin, -1]]);
    let best = origin;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const key = queue[cursor];
      if (distance(tiles[key], end) < distance(tiles[best], end)) best = key;
      if (distance(tiles[best], end) < 0.01) break;
      for (const next of [key - 1, key + 1, key - width, key + width]) {
        if (!allowed[next] || parent.has(next) || distance(tiles[key], tiles[next]) > spacing + 0.001) continue;
        queue.push(next); parent.set(next, key);
      }
    }
    const path: Tile[] = [];
    for (let key = best; key !== -1; key = parent.get(key)!) path.push(tiles[key]);
    return path.reverse();
  }
  return { entrance: tiles[entrance] ?? [0, 6.5] as Tile, route };
}
