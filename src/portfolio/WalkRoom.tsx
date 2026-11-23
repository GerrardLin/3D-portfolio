import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CanvasTexture, Group, SRGBColorSpace } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { exhibitBox, themes, type SceneSpec } from "../domain/scene.ts";
import type { CareerEntry } from "../domain/profile.ts";
import { walkMap, type Tile } from "../domain/walk.ts";
import { SpatialGallery } from "./SpatialGallery.tsx";
import { CanvasBoundary, Display } from "./Gallery.tsx";

export type WalkRequest = { target: string | Tile };
type Props = { scene: SceneSpec; entries: CareerEntry[]; request: WalkRequest | null;
  go(target: string | Tile): void; arrive(target: string | Tile): void };

function Nameplate({ title, accent }: { title: string; accent: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 230;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#142434"; ctx.fillRect(0, 0, 1024, 230);
    ctx.strokeStyle = accent; ctx.lineWidth = 5; ctx.strokeRect(11, 11, 1002, 208);
    ctx.fillStyle = accent; ctx.font = "600 28px monospace"; ctx.fillText("C E   /   P E R S O N A L   E X H I B I T I O N", 46, 71);
    ctx.fillStyle = "#fff7e6"; ctx.font = "bold 86px system-ui"; ctx.fillText(title, 40, 168, 930);
    const result = new CanvasTexture(canvas); result.colorSpace = SRGBColorSpace; return result;
  }, [title, accent]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0, 2.2, -7.58]}><boxGeometry args={[7, 1.57, .1]} /><meshBasicMaterial map={texture} toneMapped={false}/></mesh>;
}

function Room(props: Props) {
  const { scene, request, arrive, go } = props;
  const theme = themes[scene.theme];
  const exhibits = useMemo(() => scene.exhibits.filter(item => item.visible), [scene]);
  const map = useMemo(() => walkMap(exhibits), [exhibits]);
  const { camera, gl, size, invalidate } = useThree();
  const avatar = useRef<Group>(null), figure = useRef<Group>(null), marker = useRef<Group>(null);
  const position = useRef<Tile>([...map.entrance]);
  const path = useRef<Tile[]>([]);
  const pending = useRef<WalkRequest | null>(null);
  const animation = useRef(0);
  const onArrive = useRef(arrive); onArrive.current = arrive;
  useEffect(() => {
    const ratio = size.width / Math.max(size.height, 1);
    const scale = Math.max(.88, 1.22 / Math.max(ratio, .5));
    camera.position.set(7.4 * scale, 13.2 * scale, 19.2 * scale);
    const controls = new OrbitControls(camera, gl.domElement);
    controls.target.set(0, .4, 0); controls.enablePan = false; controls.minDistance = 6; controls.maxDistance = 65;
    controls.minPolarAngle = .12; controls.maxPolarAngle = Math.PI * .45;
    const redraw = () => invalidate();
    controls.addEventListener("change", redraw); controls.update(); invalidate();
    return () => { controls.removeEventListener("change", redraw); controls.dispose(); };
  }, [size.width, size.height, camera, gl, invalidate]);
  useEffect(() => {
    if (!request) return;
    const stop = exhibits.find(item => item.id === request.target);
    const bounds = stop && exhibitBox(stop);
    const dest: Tile = bounds ? [(bounds.max.x + bounds.min.x) / 2, bounds.max.z + .85]
      : typeof request.target === "string" ? map.entrance : request.target;
    path.current = map.route(position.current, dest);
    const end = path.current.at(-1);
    if (marker.current && end) { marker.current.visible = true; marker.current.position.set(end[0], .11, end[1]); }
    pending.current = request; invalidate();
  }, [request, exhibits, map, invalidate]);
  useFrame((state, delta) => {
    const job = pending.current;
    if (!job || !avatar.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let budget = reduced ? Infinity : 7 * Math.min(.07, delta);
    const pos = position.current;
    while (budget > 0 && path.current.length) {
      const [x,z] = path.current[0], dx = x-pos[0], dz = z-pos[1], length = Math.hypot(dx,dz);
      if (length > .01) avatar.current.rotation.y = Math.atan2(dx,dz);
      if (length <= budget) { pos[0]=x; pos[1]=z; budget-=length; path.current.shift(); }
      else { pos[0]+=dx*budget/length; pos[1]+=dz*budget/length; budget=0; }
    }
    avatar.current.position.set(pos[0], .13, pos[1]);
    animation.current += delta * 14;
    if (figure.current) figure.current.position.y = path.current.length && !reduced ? Math.abs(Math.sin(animation.current))*.12 : 0;
    if (!path.current.length) {
      pending.current=null; if (marker.current) marker.current.visible=false;
      onArrive.current(job.target);
    } else state.invalidate();
  });
  const sign = scene.space?.name ?? theme.label;
  const entries = new Map(props.entries.map(entry => [entry.id, entry]));
  return <>
    <color attach="background" args={[theme.background]}/><fog attach="fog" args={[theme.background,46,95]}/>
    <hemisphereLight args={["#fff8e9","#718197",2.15]}/><directionalLight position={[4,11,7]} intensity={2.4}/>
    <mesh position={[0,-.28,0]}><boxGeometry args={[18,.44,16]}/><meshStandardMaterial color={theme.grid}/></mesh>
    <mesh position={[0,.018,0]} rotation={[-Math.PI/2,0,0]} onClick={event=>{
      if (event.delta > 4) return;
      event.stopPropagation(); go([event.point.x,event.point.z]);
    }}><planeGeometry args={[17.9,15.9]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    {[-1,1].map(side=><group key={side} position={[side*8.42,0,-6.8]}>
      <mesh position={[0,1.62,0]}><boxGeometry args={[.24,3.3,.25]}/><meshStandardMaterial color={theme.grid}/></mesh>
      <mesh position={[0,3.4,0]}><sphereGeometry args={[.31,16,12]}/><meshBasicMaterial color={theme.accent}/></mesh>
    </group>)}
    <mesh position={[0,1.57,-7.75]}><boxGeometry args={[17.6,3.2,.24]}/><meshStandardMaterial color={theme.floor}/></mesh>
    <mesh position={[0,3.17,-7.7]}><boxGeometry args={[17.8,.09,.33]}/><meshBasicMaterial color={theme.accent}/></mesh>
    <Nameplate title={sign} accent={theme.accent}/>
    {scene.space ? <SpatialGallery scene={scene} exhibits={exhibits} active={null} onSelect={go}/>
      : exhibits.map(item=>entries.has(item.entryId) && <Display key={item.id} exhibit={item} entry={entries.get(item.entryId)!}
        number={scene.route.indexOf(item.id)+1} theme={scene.theme} active={false} muted={false} onSelect={go}/>)}
    <group ref={marker} visible={false}><mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.34,.42,32]}/><meshBasicMaterial color="#ffdc85"/></mesh></group>
    <group ref={avatar} position={[map.entrance[0],.13,map.entrance[1]]}>
      <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.37,.48,36]}/><meshBasicMaterial color="#ffe594"/></mesh>
      <group ref={figure}>
        <mesh position={[0,.57,0]}><capsuleGeometry args={[.25,.42,4,12]}/><meshStandardMaterial color="#ee9352"/></mesh>
        <mesh position={[0,1.05,0]}><sphereGeometry args={[.31,20,16]}/><meshStandardMaterial color="#ffdf8e"/></mesh>
        <mesh position={[0,1.08,.234]} scale={[1,.55,.54]}><sphereGeometry args={[.24,16,12]}/><meshStandardMaterial color="#283c53"/></mesh>
        {[-.15,.15].map(x=><mesh key={x} position={[x,.16,.06]}><boxGeometry args={[.19,.24,.31]}/><meshStandardMaterial color="#29364b"/></mesh>)}
      </group>
    </group>
  </>;
}

export function WalkRoom({ fallback, ...props }: Props & { fallback: React.ReactNode }) {
  return <CanvasBoundary fallback={fallback}><Canvas frameloop="demand" dpr={[1,1.5]} fallback={fallback}
    camera={{fov:42,near:.1,far:130,position:[7.4,13.2,19.2]}} aria-label="Walkable exhibition hall">
    <Room {...props}/>
  </Canvas></CanvasBoundary>;
}
