import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CAMERA_FAR, CAMERA_NEAR, FOV, assemblyCamera, components, signGeometry, stopCamera, themes, type ExhibitSpec, type SceneSpec } from "../domain/scene.ts";
import { SpatialGallery } from "./SpatialGallery.tsx";
import type { CareerEntry } from "../domain/profile.ts";

function labelTexture(entry: CareerEntry, component: ExhibitSpec["componentId"], number: number, paper: string, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 430;
  const ctx = canvas.getContext("2d")!;
  const width = 676;
  function wrap(text: string, limit: number) {
    const lines: string[] = [];
    let line = "";
    for (const character of text) {
      if (ctx.measureText(line + character).width > width) {
        const space = line.lastIndexOf(" ");
        lines.push(space > line.length / 2 ? line.slice(0, space) : line);
        line = space > line.length / 2 ? line.slice(space + 1) : "";
      }
      line += character;
    }
    if (line) lines.push(line);
    return lines.slice(0, limit).map((item, i) =>
      i === limit - 1 && lines.length > limit ? `${item.slice(0, -1)}…` : item,
    );
  }
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, 768, 430);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 768, 76);
  ctx.fillStyle = "#172325";
  ctx.font = "bold 25px monospace";
  ctx.fillText(`${String(number).padStart(2, "0")}  /  ${components[component].label.toUpperCase()}`, 42, 48, width);
  ctx.font = "bold 52px system-ui";
  const heading = wrap(entry.title, 2);
  heading.forEach((line, i) => ctx.fillText(line, 42, 151 + i * 58, width));
  ctx.font = "29px system-ui";
  ctx.fillStyle = "#344b4e";
  wrap(entry.summary, 3).forEach((line, i) => ctx.fillText(line, 42, 194 + (heading.length - 1) * 58 + i * 34, width));
  ctx.strokeStyle = "#6b8484";
  ctx.beginPath();
  ctx.moveTo(42, 366);
  ctx.lineTo(718, 366);
  ctx.stroke();
  ctx.font = "21px monospace";
  ctx.fillText(entry.kind.toUpperCase(), 42, 404);
  ctx.fillText("↗", 688, 404);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function Block({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  return <mesh position={position}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.72} />
  </mesh>;
}

function ComponentBody({ exhibit, palette, active }: {
  exhibit: ExhibitSpec;
  palette: { accent: string; floor: string; grid: string };
  active: boolean;
}) {
  const { width, depth } = components[exhibit.componentId];
  const sign = signGeometry(exhibit);
  const leg = Math.max(0.3, sign.y - sign.height / 2);
  const base = active ? palette.accent : palette.floor;
  const accent = palette.accent;
  if (exhibit.componentId === "marker") {
    return <>
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[depth * 0.48, depth * 0.5, 0.22, 28]} />
        <meshStandardMaterial color={base} />
      </mesh>
      <Block position={[0, leg / 2, -0.05]} size={[0.16, leg, 0.2]} color={accent} />
    </>;
  }
  return <>
    <Block position={[0, 0.105, 0]} size={[width, 0.21, depth]} color={base} />
    {exhibit.componentId === "plinth" && (
      <Block position={[0, (leg + 0.15) / 2, 0]} size={[width * 0.72, leg - 0.15, depth * 0.56]} color={accent} />
    )}
    {exhibit.componentId === "terminal" && <>
      <Block position={[0, leg / 2, 0]} size={[width * 0.86, leg, depth * 0.61]} color={palette.floor} />
      <Block position={[0, leg + 0.02, depth * 0.16]} size={[width * 0.85, 0.12, depth * 0.58]} color={accent} />
      {[-0.32, 0, 0.32].map(x => <Block key={x} position={[x * width, 0.32, depth * 0.32]} size={[0.16, 0.085, 0.07]} color={accent} />)}
    </>}
    {exhibit.componentId === "results" && <>
      <Block position={[0, sign.y / 2, -0.09]} size={[width, sign.y, 0.24]} color={palette.grid} />
      <Block position={[0, leg - 0.16, 0.10]} size={[width * 0.83, 0.07, 0.08]} color={accent} />
    </>}
    {(exhibit.componentId === "skills" || exhibit.componentId === "panel") && [-0.37, 0.37].map(x => (
      <Block key={x} position={[x * width, leg / 2, -0.04]} size={[0.115, leg, 0.2]} color={accent} />
    ))}
    {exhibit.componentId === "skills" && [0.31, 0.58].map(y => (
      <Block key={y} position={[0, y * leg, 0.10]} size={[width * 0.85, 0.09, depth * 0.55]} color={palette.grid} />
    ))}
  </>;
}

export function Display({ exhibit, entry, number, theme, active, muted, onSelect }: {
  exhibit: ExhibitSpec;
  entry: CareerEntry;
  number: number;
  theme: SceneSpec["theme"];
  active: boolean;
  muted: boolean;
  onSelect(id: string): void;
}) {
  const palette = themes[theme];
  const { accent, panels, grid } = palette;
  const { componentId } = exhibit;
  const texture = useMemo(() => labelTexture(entry, componentId, number, panels, accent), [entry, componentId, number, panels, accent]);
  useEffect(() => () => texture.dispose(), [texture]);
  const sign = signGeometry(exhibit);
  const select = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 4) return;
    event.stopPropagation();
    onSelect(exhibit.id);
  };
  return (
    <group position={[exhibit.position[0], 0, exhibit.position[1]]} onClick={select}>
      <ComponentBody exhibit={exhibit} palette={muted ? { ...palette, accent: palette.grid } : palette} active={active} />
      <Block position={[0, sign.y, 0.079]} size={[sign.width + 0.1, sign.height + 0.1, 0.17]}
        color={!muted && (active || componentId === "plinth") ? accent : grid} />
      <mesh position={[0, sign.y, sign.z]}>
        <planeGeometry args={[sign.width, sign.height]} />
        <meshBasicMaterial map={texture} color={muted ? "#647078" : "#ffffff"} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Environment({ theme, overview }: { theme: SceneSpec["theme"]; overview: boolean }) {
  const { grid, accent, floor } = themes[theme];
  return <>
    <Block position={[0, -0.185, 0]} size={[14, 0.36, 12]} color={floor} />
    {theme !== "clay" && <gridHelper args={[12, theme === "blueprint" ? 24 : 12, grid, grid]}
      position={[0, 0.001, 0]} scale={[14 / 12, 1, 1]} />}
    {overview && theme === "blueprint" && <>
      {[-5.8, 0, 5.8].map(x => <Block key={x} position={[x, 0.52, -5.93]} size={[0.06, 1.04, 0.06]} color={accent} />)}
      <Block position={[0, 1.05, -5.93]} size={[12, 0.045, 0.055]} color={accent} />
    </>}
    {overview && theme === "clay" && [-4.6, 0, 4.6].map(x => (
      <mesh key={x} position={[x, 0.21, -5.82]}>
        <torusGeometry args={[0.75, 0.08, 12, 40, Math.PI]} />
        <meshStandardMaterial color={accent} />
      </mesh>
    ))}
    {overview && theme === "gallery" && [-6.2, 6.2].map(x =>
      <Block key={x} position={[x, 0.65, -5.7]} size={[0.56, 1.3, 0.24]} color={grid} />,
    )}
  </>;
}

function CameraGuide({ current, exhibits, space, reset }: { current?: ExhibitSpec; exhibits: ExhibitSpec[]; space?: SceneSpec["space"]; reset: number }) {
  const { camera, size, invalidate, gl } = useThree();
  const orbit = useRef<OrbitControls | null>(null);
  const guided = useRef(true);
  useEffect(() => {
    const control = new OrbitControls(camera, gl.domElement);
    control.enablePan = false;
    control.minDistance = 2;
    control.maxDistance = 45;
    control.maxPolarAngle = Math.PI * 0.498;
    control.target.set(0, 0.9, 0.05);
    const interrupt = () => { guided.current = false; };
    const redraw = () => invalidate();
    control.addEventListener("start", interrupt);
    control.addEventListener("change", redraw);
    orbit.current = control;
    return () => { control.removeEventListener("start", interrupt); control.removeEventListener("change", redraw); control.dispose(); orbit.current = null; };
  }, [camera, gl, invalidate]);
  const aspect = size.width / Math.max(size.height, 1);
  const widthScale = Math.max(1, 1.48 / Math.max(aspect, 0.8));
  const stop = useMemo(() => {
    if (!current) return undefined;
    return current.assembly && space ? assemblyCamera(current, space.viewpoint, aspect) : stopCamera(current, exhibits);
  }, [current, exhibits, space, aspect]);
  const worldView = space?.viewpoint === "overhead" ? [2.1, 15.2, 14.3]
    : space?.viewpoint === "low" ? [5.4, 7.2, 18.1] : [7.3, 10.7, 17.8];
  const overview = space ? worldView.map(value => value * 0.88) : [4.2, 8.9, 16.4];
  const pose = stop || {
    eye: [overview[0] * widthScale, overview[1] * widthScale, overview[2] * widthScale],
    target: [0, space ? 0.08 : 0.9, 0.05],
  };
  const eye = useMemo(() => new Vector3(), []);
  const targetPose = useMemo(() => new Vector3(), []);
  const [ex, ey, ez] = pose.eye;
  const [tx, ty, tz] = pose.target;
  useEffect(() => {
    guided.current = true;
    eye.set(ex, ey, ez);
    targetPose.set(tx, ty, tz);
    invalidate();
  }, [ex, ey, ez, tx, ty, tz, eye, targetPose, invalidate, reset]);
  useFrame((state, delta) => {
    const control = orbit.current;
    if (!guided.current || !control) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fraction = reduced ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 8);
    camera.position.lerp(eye, fraction);
    control.target.lerp(targetPose, fraction);
    control.update();
    if (camera.position.distanceToSquared(eye) + control.target.distanceToSquared(targetPose) > 0.0001) state.invalidate();
    else guided.current = false;
  });
  return null;
}

export class CanvasBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function Gallery({ scene, entries, active, onSelect, fallback, reset }: {
  scene: SceneSpec;
  entries: CareerEntry[];
  active: string | null;
  onSelect(id: string): void;
  fallback: ReactNode;
  reset: number;
}) {
  const visible = useMemo(() => scene.exhibits.filter(exhibit => exhibit.visible), [scene.exhibits]);
  const byEntry = new Map(entries.map(entry => [entry.id, entry]));
  const byExhibit = new Map(visible.map(exhibit => [exhibit.id, exhibit]));
  const palette = themes[scene.theme];
  return (
    <CanvasBoundary fallback={fallback}>
      <Canvas
        aria-label="Interactive 3D gallery"
        frameloop="demand"
        dpr={[1, 1.5]}
        fallback={fallback}
        camera={{ fov: FOV, near: CAMERA_NEAR, far: CAMERA_FAR, position: [6, 8.2, 16.8] }}
      >
        <color attach="background" args={[palette.background]} />
        <fog attach="fog" args={[palette.background, 18, 55]} />
        <hemisphereLight intensity={2.1} args={["#f7ffe7", "#243228"]} />
        <directionalLight position={[-5, 10, 7]} intensity={2.4} color={scene.theme === "blueprint" ? "#d8eeff" : "#ffefd5"} />
        {!scene.space && <Environment theme={scene.theme} overview={!active} />}
        <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color={palette.background} roughness={1} />
        </mesh>
        {scene.space
          ? <SpatialGallery scene={scene} exhibits={visible} active={active} onSelect={onSelect} />
          : <>
              {scene.route.slice(1).map((id, index) => {
                const a = byExhibit.get(scene.route[index]);
                const b = byExhibit.get(id);
                if (!a || !b) return null;
                const [x1, z1] = a.position;
                const [x2, z2] = b.position;
                return (
                  <mesh key={id} position={[(x1 + x2) / 2, 0.022, (z1 + z2) / 2]}
                    rotation={[-Math.PI / 2, 0, -Math.atan2(z2 - z1, x2 - x1)]}>
                    <planeGeometry args={[Math.hypot(x2 - x1, z2 - z1), 0.025]} />
                    <meshBasicMaterial color={palette.accent} transparent opacity={0.65} />
                  </mesh>
                );
              })}
              {visible.map(exhibit => {
                const entry = byEntry.get(exhibit.entryId);
                return entry && <Display key={exhibit.id} exhibit={exhibit} entry={entry}
                  number={scene.route.indexOf(exhibit.id) + 1} theme={scene.theme} active={active === exhibit.id} muted={!!active && active !== exhibit.id} onSelect={onSelect} />;
              })}
          </>}
        <CameraGuide current={active ? byExhibit.get(active) : undefined} exhibits={visible} space={scene.space} reset={reset} />
      </Canvas>
    </CanvasBoundary>
  );
}
