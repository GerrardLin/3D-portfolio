import { useState, type CSSProperties } from "react";
import { ArrowDownRight, Box, ChevronLeft, ChevronRight, LayoutGrid, Maximize } from "lucide-react";
import { Gallery } from "./Gallery.tsx";
import { ComponentIcon, routedEntries } from "./DesignChoices.tsx";
import { components, themes, type SceneSpec } from "../domain/scene.ts";
import type { CareerEntry } from "../domain/profile.ts";
import "./preview.css";

export function Preview({ scene, entries, active, onSelect, label }: {
  scene: SceneSpec;
  entries: CareerEntry[];
  active: string | null;
  onSelect(id: string | null): void;
  label: string;
}) {
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [reset, setReset] = useState(0);
  const exhibits = routedEntries(scene, entries);
  const index = exhibits.findIndex(({ exhibit }) => exhibit.id === active);
  const current = exhibits[index];
  const palette = themes[scene.theme];
  const relatedIds = new Set(scene.space?.connections.flatMap(([a, b]) => a === active ? [b] : b === active ? [a] : []));
  const related = exhibits.filter(({ exhibit }) => relatedIds.has(exhibit.id));

  const readingView = (
    <div className="reading-view" aria-label="2D portfolio">
      {!exhibits.length && <p>No exhibits are visible.</p>}
      {exhibits.map(({ exhibit, entry }, i) => (
        <button className={`reading-card ${active === exhibit.id ? "reading-card-active" : ""}`}
          key={exhibit.id} onClick={() => onSelect(exhibit.id)} aria-pressed={active === exhibit.id}>
          <span className="reading-caption"><ComponentIcon id={exhibit.componentId} size={13} /> {String(i + 1).padStart(2, "0")} / {components[exhibit.componentId].label}</span>
          <strong>{entry.title}</strong>
          <span>{entry.summary}</span>
        </button>
      ))}
    </div>
  );
  return (
    <section className="portfolio-preview" aria-label="Portfolio preview"
      style={{ "--preview-accent": palette.accent, "--preview-bg": palette.background, "--preview-floor": palette.floor, "--preview-grid": palette.grid } as CSSProperties}>
      <div className="preview-toolbar">
        <span className="preview-label"><span className="preview-dot" />{scene.space?.name ?? label}</span>
        <div className="view-switch" role="group" aria-label="Preview mode">
          <button type="button" onClick={() => setMode("3d")} aria-pressed={mode === "3d"}><Box size={15} /> 3D view</button>
          <button type="button" onClick={() => setMode("2d")} aria-pressed={mode === "2d"}><LayoutGrid size={15} /> 2D view</button>
        </div>
      </div>
      <div className={`preview-stage ${mode === "2d" ? "preview-2d" : ""}`}>
        {mode === "3d" ? (
          <Gallery scene={scene} entries={entries} active={active} onSelect={onSelect} reset={reset}
            fallback={<div className="preview-fallback"><p role="status">3D is unavailable. Browse the exhibits below.</p>{readingView}</div>} />
        ) : readingView}
        {mode === "3d" && <span className="stage-guide">Drag to orbit · Scroll or pinch to zoom</span>}
        {mode === "3d" && <button className="preview-overview" type="button" onClick={() => { onSelect(null); setReset(value => value + 1); }}
          aria-label="Return to gallery overview" title="Gallery overview"><Maximize size={16} /></button>}
      </div>
      <div className="preview-route">
        <div className="preview-stop" aria-live="polite">
          <span className="stop-icon" style={{ backgroundColor: palette.accent }}><ArrowDownRight size={19} /></span>
          <span><small>{current ? `STOP ${index + 1} / ${exhibits.length}` : "GUIDED ROUTE"}</small>
            <strong>{current?.entry.title ?? "Gallery overview"}</strong></span>
        </div>
        <div className="route-buttons">
          <button type="button" aria-label="Previous stop" onClick={() => onSelect(exhibits[index - 1]?.exhibit.id ?? null)}
            disabled={index < 0}><ChevronLeft size={18} /></button>
          <button type="button" aria-label="Next stop" onClick={() => onSelect(exhibits[index + 1]?.exhibit.id ?? null)}
            disabled={index >= exhibits.length - 1}><ChevronRight size={18} /></button>
        </div>
      </div>
      {related.length > 0 && <div className="preview-related">
        <span>Explore related work</span>
        <div>{related.map(({ exhibit, entry }) => (
          <button key={exhibit.id} type="button" onClick={() => onSelect(exhibit.id)}>
            {entry.title}<ChevronRight size={14} aria-hidden="true" />
          </button>
        ))}</div>
      </div>}
    </section>
  );
}
