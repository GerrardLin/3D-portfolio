import { ArrowDown, ArrowUp, CircleCheck, FileText, ScanLine, SlidersHorizontal } from "lucide-react";
import type { FormEvent } from "react";
import type { CareerEntry, ReviewEntry } from "../domain/profile.ts";
import { components, themes, type SceneIssue, type SceneSpec, type ExhibitSpec } from "../domain/scene.ts";
import { partFinishes, partForms, viewpoints, type SpaceSpec } from "../domain/spatial.ts";
import type { Candidate } from "../../server/agent.ts";

export const origins: Record<Candidate["origin"], string> = {
  model: "AI design",
  revised: "AI revised",
  local: "Local composer",
  fallback: "Validated fallback",
  sample: "Prepared sample",
};

export function Inspector({ scene, exhibit, entry, entries, source, issues, candidate, onExhibit, onEditEntry, onSelect, onShift, onTheme, onViewpoint }: {
  scene: SceneSpec;
  exhibit?: ExhibitSpec;
  entry?: CareerEntry;
  entries: CareerEntry[];
  source?: ReviewEntry;
  issues: SceneIssue[];
  candidate: Candidate;
  onExhibit(updated: ExhibitSpec): void;
  onEditEntry(updated: CareerEntry): void;
  onSelect(id: string): void;
  onShift(id: string, direction: number): void;
  onTheme(theme: SceneSpec["theme"]): void;
  onViewpoint(viewpoint: SpaceSpec["viewpoint"]): void;
}) {
  const stage = exhibit ? scene.route.indexOf(exhibit.id) : -1;
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entry) return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title")).trim();
    const summary = String(data.get("summary")).trim();
    if (title && summary) onEditEntry({ ...entry, title, summary });
  }
  return (
    <aside className="sheet inspector">
      <div className="section-heading"><h2>Inspector</h2><SlidersHorizontal size={16} /></div>
      <label>Scene palette<select value={scene.theme} onChange={e => onTheme(e.target.value as SceneSpec["theme"])}>
        {Object.entries(themes).map(([id, theme]) => <option key={id} value={id}>{theme.label}</option>)}
      </select></label>
      {scene.space && <label>Spatial viewpoint
        <select value={scene.space.viewpoint} onChange={event => onViewpoint(event.target.value as SpaceSpec["viewpoint"])}>
          {viewpoints.map(view => <option key={view} value={view}>{view}</option>)}
        </select>
      </label>}
      <label>Exhibit<select value={exhibit?.id ?? ""} onChange={e => onSelect(e.target.value)}>
        {scene.exhibits.map(({ id, entryId, visible }) => (
          <option key={id} value={id}>
            {entries.find(item => item.id === entryId)?.title ?? "Exhibit"}{!visible ? " · Hidden" : ""}
          </option>
        ))}
      </select></label>
      {exhibit && entry && (
        <>
          <form className="inspector-form" key={JSON.stringify(entry)} onSubmit={save}>
            <label>Title<input name="title" defaultValue={entry.title} required maxLength={80} /></label>
            <label>Public summary<textarea name="summary" rows={3} defaultValue={entry.summary} required maxLength={360} /></label>
            {source && <details className="review-source"><summary><FileText size={14} /> Verify source</summary><blockquote>{source.quote}</blockquote></details>}
            <button type="submit" className="button button-secondary button-small">Apply approved text</button>
          </form>
          <div className="inspector-form">
            {exhibit.assembly ? (
              <details className="assembly-inspector">
                <summary>Geometry · {exhibit.assembly.length} pieces</summary>
                {exhibit.assembly.map((part, index) => (
                  <div className="coordinates assembly-piece" key={index}>
                    <label>Piece {index + 1}<select value={part.form} onChange={event => {
                      const form = event.target.value as typeof part.form;
                      onExhibit({ ...exhibit, assembly: exhibit.assembly?.map((item, i) => i === index ? { ...item, form } : item) });
                    }}>{partForms.map(form => <option key={form}>{form}</option>)}</select></label>
                    <label>Finish<select value={part.finish} onChange={event => {
                      const finish = event.target.value as typeof part.finish;
                      onExhibit({ ...exhibit, assembly: exhibit.assembly?.map((item, i) => i === index ? { ...item, finish } : item) });
                    }}>{partFinishes.map(finish => <option key={finish}>{finish}</option>)}</select></label>
                  </div>
                ))}
              </details>
            ) : (
              <label>Component<select value={exhibit.componentId} onChange={e => onExhibit({ ...exhibit, componentId: e.target.value as ExhibitSpec["componentId"] })}>
              {Object.entries(components).map(([id, part]) => <option key={id} value={id}>{part.label}</option>)}
            </select></label>
            )}
            <div className="coordinates">
              {(["X position", "Z position"] as const).map((name, index) => (
                <label key={name}>{name}
                  <input type="number" step={0.25} min={-25} max={25} value={exhibit.position[index]}
                    onChange={e => {
                      const next = e.target.valueAsNumber;
                      if (!Number.isFinite(next)) return;
                      const position: [number, number] = [...exhibit.position];
                      position[index] = Math.min(25, Math.max(-25, next));
                      onExhibit({ ...exhibit, position });
                    }} />
                </label>
              ))}
            </div>
            <label>{exhibit.assembly ? "Minimum camera distance" : "Camera distance"} <input type="number" step={0.25} min={0.5} max={25} value={exhibit.cameraDistance}
              onChange={e => {
                const next = e.target.valueAsNumber;
                if (Number.isFinite(next)) onExhibit({ ...exhibit, cameraDistance: Math.min(25, Math.max(0.5, next)) });
              }} /></label>
            <label className="check-label"><input type="checkbox" checked={exhibit.visible}
              onChange={e => onExhibit({ ...exhibit, visible: e.target.checked })} /> Show exhibit</label>
            <div className="route-edit"><span>{stage < 0 ? "Hidden from route" : `Route stop ${stage + 1} of ${scene.route.length}`}</span>
              <button type="button" className="icon-button" title="Move earlier in route" aria-label="Move earlier in route"
                disabled={stage <= 0} onClick={() => onShift(exhibit.id, -1)}><ArrowUp size={15} /></button>
              <button type="button" className="icon-button" title="Move later in route" aria-label="Move later in route"
                disabled={stage < 0 || stage >= scene.route.length - 1} onClick={() => onShift(exhibit.id, 1)}><ArrowDown size={15} /></button>
            </div>
          </div>
        </>
      )}
      <div className="checks">
        {issues.length ? <strong className="check-bad"><ScanLine size={16} /> {issues.length} layout {issues.length === 1 ? "issue" : "issues"}</strong>
          : <strong className="check-good"><CircleCheck size={16} /> Scene checks passed</strong>}
        {issues.length > 0 && <ul>{issues.map((issue, i) => <li key={i}>
          {issue.exhibitId && scene.exhibits.some(e => e.id === issue.exhibitId)
            ? <button type="button" onClick={() => onSelect(issue.exhibitId!)}>{issue.detail}</button> : issue.detail}
        </li>)}</ul>}
        {candidate.attempts.length > 0 && <details>
          <summary>Generation checks</summary>
          {candidate.attempts.map((attempt, i) => <div className="attempt" key={i}>
            <b>{i ? "Revision" : "First design"} · {(attempt.ms / 1000).toFixed(1)}s</b>
            <p>{attempt.issues.length ? attempt.issues.map(({ detail }) => detail).join(" ") : "Passed all checks."}</p>
          </div>)}
        </details>}
      </div>
    </aside>
  );
}
