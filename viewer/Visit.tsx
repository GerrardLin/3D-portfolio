import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Footprints, MapPin } from "lucide-react";
import { WalkRoom, type WalkRequest } from "../src/portfolio/WalkRoom.tsx";
import { routedEntries } from "../src/portfolio/DesignChoices.tsx";
import type { PublishedPortfolio } from "../src/domain/scene.ts";
import type { Tile } from "../src/domain/walk.ts";

export function Visit({data, leave}: {data: PublishedPortfolio; leave(): void}) {
  const [request,setRequest] = useState<WalkRequest|null>(null);
  const [open,setOpen] = useState<string|null>(null);
  const [moving,setMoving] = useState(false);
  const [seen,setSeen] = useState<Set<string>>(()=>new Set());
  const exit = useRef<HTMLButtonElement>(null);
  const items = routedEntries(data.scene,data.entries);
  const item = items.find(row=>row.exhibit.id===open);
  const target = items.find(row=>row.exhibit.id===request?.target);
  const next = items.find(row=>!seen.has(row.exhibit.id));
  function go(target: string | Tile) { setOpen(null); setMoving(true); setRequest({target}); }
  function arrive(target: string | Tile) {
    setMoving(false);
    if (typeof target === "string") { setOpen(target); setSeen(old=>new Set(old).add(target)); }
  }
  useEffect(()=>{exit.current?.focus({preventScroll:true});},[]);
  useEffect(()=>{
    function escape(event: KeyboardEvent) {
      if(event.key!=="Escape" || event.defaultPrevented) return;
      if(item) { setOpen(null); exit.current?.focus({preventScroll:true}); } else leave();
    }
    window.addEventListener("keydown",escape);
    return ()=>window.removeEventListener("keydown",escape);
  }, [item,leave]);
  return <section className="walk-visit" aria-label="Walking tour">
    <div className="walk-top"><div><span className="walk-kicker">ON THE EXHIBITION FLOOR</span><h2>{data.scene.space?.name ?? data.author}</h2></div>
      <button className="walk-exit" ref={exit} onClick={leave}><ArrowLeft size={15}/> Exit tour</button></div>
    <div className="walk-stage">
      <WalkRoom scene={data.scene} entries={data.entries} request={request} go={go} arrive={arrive}
        fallback={<div className="walk-fallback"><p>3D is unavailable on this device.</p><button onClick={leave}>Return to the readable portfolio</button></div>}/>
      <span className="walk-pass"><Footprints size={15}/> {seen.size} / {items.length} visited</span>
      <div className="walk-legend"><i/> You <span>·</span> Tap the floor to walk · Drag to look around</div>
    </div>
    <div className="walk-tools">
      <div className="walk-info" aria-live="polite">
        <span className="walk-kicker">{item ? "EXHIBIT " + String(item.number).padStart(2,"0") + "  /  " + item.entry.kind : moving ? "IN TRANSIT" : "FIELD GUIDE"}</span>
        <h3>{item ? item.entry.title : moving ? (target ? "Walking to " + target.entry.title : "Walking across the hall") : seen.size===items.length ? "Tour complete" : "Choose an exhibit to visit"}</h3>
        <p>{item ? item.entry.summary : "Tap a numbered object or choose a stop below. Your guide will walk there and open the corresponding résumé entry."}</p>
      </div>
      <div className="walk-actions">{next && <button onClick={()=>go(next.exhibit.id)} disabled={moving}>Next unvisited <ArrowRight size={14}/></button>}
        {item && <button onClick={()=>setOpen(null)}>Close exhibit</button>}</div>
    </div>
    <nav className="walk-stops" aria-label="Walk to an exhibit">{items.map(row=><button key={row.exhibit.id}
      aria-current={open===row.exhibit.id?"step":undefined} onClick={()=>go(row.exhibit.id)}>
      {seen.has(row.exhibit.id)?<Check size={14}/>:<MapPin size={14}/>} <b>{String(row.number).padStart(2,"0")}</b> {row.entry.title}</button>)}</nav>
  </section>;
}
