import { ArrowUpRight, ChartNoAxesColumn, CircleDot, Layers3, MapPin, Monitor, PanelsTopLeft } from "lucide-react";
import { components, themes, type DesignNotes, type ExhibitSpec, type SceneSpec } from "../domain/scene.ts";
import type { CareerEntry } from "../domain/profile.ts";

const componentIcons = {
  plinth: Layers3, panel: PanelsTopLeft, marker: MapPin, terminal: Monitor, results: ChartNoAxesColumn, skills: CircleDot,
};

export function ComponentIcon({ id, size = 17 }: { id: ExhibitSpec["componentId"]; size?: number }) {
  const Icon = componentIcons[id];
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}

export function routedEntries(scene: SceneSpec, entries: CareerEntry[]) {
  const byEntry = new Map(entries.map(entry => [entry.id, entry]));
  const byExhibit = new Map(scene.exhibits.filter(exhibit => exhibit.visible).map(exhibit => [exhibit.id, exhibit]));
  return scene.route.flatMap((id, index) => {
    const exhibit = byExhibit.get(id);
    const entry = exhibit && byEntry.get(exhibit.entryId);
    return exhibit && entry ? [{ exhibit, entry, number: index + 1 }] : [];
  });
}

export function DesignChoices({ scene, entries, notes, onSelect }: {
  scene: SceneSpec;
  entries: CareerEntry[];
  notes?: DesignNotes;
  onSelect(id: string): void;
}) {
  const palette = themes[scene.theme];
  const cues = notes?.theme.entryIds.flatMap(id => entries.find(entry => entry.id === id)?.title ?? []);
  return (
    <section className="design-report" aria-label="Design choices">
      <div className="design-report-heading">
        <div>
          <h2>Design choices</h2>
          <p>{notes?.theme.reason ?? palette.intent}</p>
        </div>
        <span className="design-palette">
          <span style={{ background: palette.floor }} /><span style={{ background: palette.accent }} /><span style={{ background: palette.panels }} />
          {palette.label}
        </span>
      </div>
      {scene.space && <p className="design-cues">
        <b>{scene.space.name}</b> · {scene.space.viewpoint} view · {scene.exhibits.reduce((sum, exhibit) =>
          sum + (exhibit.visible ? (exhibit.assembly?.length ?? 0) : 0), 0)} geometry pieces
      </p>}
      {!!cues?.length && <p className="design-cues"><b>Résumé cues</b> {cues.join(" · ")}</p>}
      <div className="design-decisions">
        {routedEntries(scene, entries).map(({ exhibit, entry }) => (
          <button type="button" className="design-decision" key={exhibit.id} onClick={() => onSelect(exhibit.id)}>
            <ComponentIcon id={exhibit.componentId} />
            <span><small>{exhibit.assembly ? [...new Set(exhibit.assembly.map(part => part.form))].join(" · ") : components[exhibit.componentId].label}</small><strong>{entry.title}</strong>
              <span>{notes?.exhibits.find(note => note.entryId === entry.id)?.reason ?? components[exhibit.componentId].intent}</span>
            </span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
