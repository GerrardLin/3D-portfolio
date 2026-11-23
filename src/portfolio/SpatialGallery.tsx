import { useEffect, useMemo } from "react";
import { CanvasTexture, ExtrudeGeometry, Shape, SRGBColorSpace, Vector3 } from "three";
import { exhibitBox, themes, type ExhibitSpec, type SceneSpec } from "../domain/scene.ts";
import type { Part, SpaceSpec } from "../domain/spatial.ts";

function Wedge() {
  const geometry = useMemo(() => {
    const slope = new Shape();
    slope.moveTo(-0.5, -0.5);
    slope.lineTo(0.5, -0.5);
    slope.lineTo(0.5, 0.5);
    slope.closePath();
    return new ExtrudeGeometry(slope, { bevelEnabled: false, depth: 1 }).translate(0, 0, -0.5);
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

type Material = { color: string; metalness: number; roughness: number; emissive: string; emissiveIntensity: number };

function Solid({ part, palette, surface }: {
  part: Part;
  palette: typeof themes[keyof typeof themes];
  surface?: CanvasTexture;
}) {
  const colors = {
    structure: palette.background, surface: palette.floor, accent: palette.accent,
    paper: palette.panels, metal: palette.grid,
  };
  const material: Material = {
    color: colors[part.finish],
    metalness: part.finish === "metal" ? 0.48 : 0.12,
    roughness: part.finish === "metal" ? 0.34 : 0.61,
    emissive: part.finish === "accent" ? palette.accent : "#000",
    emissiveIntensity: 0.24,
  };
  const paint = <meshStandardMaterial {...material} color={surface ? "white" : material.color} map={surface ?? null} />;
  return (
    <group position={part.at} rotation={[0, (part.yaw ?? 0) * Math.PI / 180, 0]} scale={part.size}>
      {part.form === "box" && <mesh><boxGeometry />{paint}</mesh>}
      {part.form === "disc" && <mesh><cylinderGeometry args={[0.5, 0.5, 1, 40]} />{paint}</mesh>}
      {part.form === "wedge" && <mesh><Wedge />{paint}</mesh>}
      {part.form === "dome" && (
        <mesh position={[0, -0.5, 0]} scale={[1, 2, 1]}>
          <sphereGeometry args={[0.5, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />{paint}
        </mesh>
      )}
      {part.form === "ring" && <mesh scale={[1, 1, 4]}><torusGeometry args={[0.39, 0.1, 16, 48]} />{paint}</mesh>}
      {part.form === "arch" && (
        <>
          <mesh position={[0, 0.03, 0]} scale={[1, 0.94, 4]}>
            <torusGeometry args={[0.41, 0.08, 12, 36, Math.PI]} />{paint}
          </mesh>
          {[-0.41, 0.41].map(x => (
            <mesh key={x} position={[x, -0.235, 0]} scale={[0.16, 0.53, 0.64]}><boxGeometry />{paint}</mesh>
          ))}
        </>
      )}
    </group>
  );
}

function StopMarker({ number, position, accent, onSelect }: {
  number: number;
  position: [number, number, number];
  accent: string;
  onSelect(): void;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(64, 64, 53, 0, Math.PI * 2);
    ctx.fillStyle = "#111920";
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 54px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(number).padStart(2, "0"), 64, 65);
    const label = new CanvasTexture(canvas);
    label.colorSpace = SRGBColorSpace;
    return label;
  }, [number, accent]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[0.05, 0.05, 1]} onClick={event => {
      if (event.delta > 4) return;
      event.stopPropagation();
      onSelect();
    }}>
      <spriteMaterial map={texture} sizeAttenuation={false} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function Connections({ space, exhibits, accent }: {
  space: SpaceSpec;
  exhibits: ExhibitSpec[];
  accent: string;
}) {
  const byId = new Map(exhibits.map(item => [item.id, item]));
  return space.connections.map(([from, to]) => {
    const a = byId.get(from);
    const b = byId.get(to);
    if (!a || !b) return null;
    const first = exhibitBox(a).getCenter(new Vector3());
    const last = exhibitBox(b).getCenter(new Vector3());
    const dx = last.x - first.x;
    const dz = last.z - first.z;
    const length = Math.hypot(dx, dz);
    if (length < 0.1) return null;
    return (
      <mesh key={`${from}:${to}`} position={[(first.x + last.x) / 2, 0.035, (first.z + last.z) / 2]}
        rotation={[0, -Math.atan2(dz, dx), 0]}>
        <boxGeometry args={[length, 0.027, 0.04]} />
        <meshBasicMaterial color={accent} transparent opacity={0.62} />
      </mesh>
    );
  });
}

function surfacePrint(palette: typeof themes[keyof typeof themes], atlas: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 768;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = palette.floor;
  ctx.fillRect(0, 0, 768, 768);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.22;
  if (atlas) {
    for (let band = 1; band <= 15; band++) {
      ctx.beginPath();
      for (let step = 0; step <= 144; step++) {
        const angle = step / 144 * Math.PI * 2;
        const radius = band * (31 + 3 * Math.sin(3 * angle + band / 9) + 4 * Math.cos(2 * angle));
        const x = 360 + Math.cos(angle) * radius;
        const y = 345 + Math.sin(angle) * radius * 0.85;
        if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else {
    for (let line = 0; line <= 768; line += 32) {
      ctx.globalAlpha = line % 128 === 0 ? 0.34 : 0.12;
      ctx.beginPath(); ctx.moveTo(line, 0); ctx.lineTo(line, 768); ctx.moveTo(0, line); ctx.lineTo(768, line); ctx.stroke();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function SpatialGallery({ scene, exhibits, active, onSelect }: {
  scene: SceneSpec;
  exhibits: ExhibitSpec[];
  active: string | null;
  onSelect(id: string): void;
}) {
  const palette = themes[scene.theme];
  const atlas = scene.space?.scenery.some(part => part.form === "disc" && part.size[0] > 12) ?? false;
  const surface = useMemo(() => surfacePrint(palette, atlas), [palette, atlas]);
  useEffect(() => () => surface.dispose(), [surface]);
  if (!scene.space) return null;
  const focus = active ? exhibits.find(exhibit => exhibit.id === active) : undefined;
  return (
    <>
      {!focus && <>
        {scene.space.scenery.map((part, index) => <Solid key={index} part={part} palette={palette}
          surface={part.finish === "surface" && part.size[0] > 10 && part.size[2] > 10 ? surface : undefined} />)}
        <Connections space={scene.space} exhibits={exhibits} accent={palette.accent} />
      </>}
      {exhibits.filter(exhibit => !focus || focus.id === exhibit.id).map(exhibit => {
        const bounds = exhibitBox(exhibit);
        const center = bounds.getCenter(new Vector3());
        const number = scene.route.indexOf(exhibit.id) + 1;
        return (
          <group key={exhibit.id}>
            {focus && <mesh position={[center.x, -0.11, center.z]}>
              <cylinderGeometry args={[Math.max(bounds.max.x - center.x, bounds.max.z - center.z) + 0.55,
                Math.max(bounds.max.x - center.x, bounds.max.z - center.z) + 0.55, 0.2, 48]} />
              <meshStandardMaterial color={palette.floor} />
            </mesh>}
            <group position={[exhibit.position[0], 0, exhibit.position[1]]} onClick={event => {
              if (event.delta > 4) return;
              event.stopPropagation();
              onSelect(exhibit.id);
            }}>
              {exhibit.assembly?.map((part, index) => <Solid key={index} part={part} palette={palette} />)}
            </group>
            {!focus && number > 0 && <StopMarker number={number} position={[center.x, bounds.max.y + 0.48, center.z]}
              accent={palette.accent} onSelect={() => onSelect(exhibit.id)} />}
          </group>
        );
      })}
    </>
  );
}
