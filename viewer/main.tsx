import { useRef, useState, type CSSProperties } from "react";
import { Folio } from "./Folio.tsx";
import { Workshop } from "./Workshop.tsx";
import { Visit } from "./Visit.tsx";
import { createRoot } from "react-dom/client";
import { ArrowUpRight, Box, Route } from "lucide-react";
import { ComponentIcon, DesignChoices, routedEntries } from "../src/portfolio/DesignChoices.tsx";
import { Preview } from "../src/portfolio/Preview.tsx";
import { Demonstration, type Demonstration as DemoData } from "../src/domain/demo.ts";
import { kinds } from "../src/domain/profile.ts";
import { Published, components, layoutNames, themes, type DesignNotes, type PublishedPortfolio } from "../src/domain/scene.ts";
import "./viewer.css";

const sectionNames = { Project: "Projects", Experience: "Experience", Skill: "Skills and tools", Achievement: "Achievements" };

function Portfolio({ data, notes, controls, label }: {
  data: PublishedPortfolio;
  notes?: DesignNotes;
  controls?: React.ReactNode;
  label?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const hasWorkshop=data.scene.entrance === "signal-service" && data.scene.route.length>0;
  const hasFolio=!!data.scene.entrance && data.scene.entrance!=="gallery" && !hasWorkshop && data.scene.route.length>0;
  const [atDesk,setDesk]=useState(hasWorkshop||hasFolio);
  function floor(){setDesk(false);requestAnimationFrame(()=>document.getElementById("top")?.scrollIntoView());}
  const [tour,setTour] = useState(false);
  const enterButton = useRef<HTMLButtonElement>(null);
  function toggleTour(value: boolean) {
    setTour(value);
    requestAnimationFrame(()=>{ if(value) document.getElementById("gallery")?.scrollIntoView({block:"start"});
      else enterButton.current?.focus(); });
  }
  const items = routedEntries(data.scene, data.entries);
  const featured = items[0];
  const current = items.find(item => item.exhibit.id === active) ?? featured;
  const palette = themes[data.scene.theme];
  function select(id: string) {
    setTour(false);
    setActive(id);setDesk(false);
    requestAnimationFrame(()=>document.getElementById("gallery")?.scrollIntoView({ block: "start" }));
  }
  return (
    <div className={`portfolio-site theme-${data.scene.theme}`}
      style={{ "--view-theme": palette.background, "--view-accent": palette.accent, "--view-paper": palette.panels } as CSSProperties}>
      {controls && <div className="viewer">{controls}</div>}
      {hasFolio && atDesk && <Folio data={data} floor={floor}/>}
      {hasWorkshop && <Workshop data={data} visible={atDesk} floor={floor}/>}
      {!atDesk && <div className="viewer-nav">
        <div className="viewer-nav-inner">
          <a className="viewer-brand" href="#top"><Box size={20} /> Career Exhibit</a>
          <nav aria-label="Portfolio sections">
            {(hasWorkshop||hasFolio) && <button className="return-workshop" onClick={()=>{setDesk(true);setTour(false);requestAnimationFrame(()=>window.scrollTo(0,0));}}>{hasWorkshop?"Return to workshop":"Return to portfolio"}</button>}
            <a href="#gallery">Gallery</a>
            <a href="#exhibits">Exhibits</a>
            {notes && <a href="#design">Design choices</a>}
          </nav>
        </div>
      </div>}
      <main className="viewer" id="top">
        {!atDesk && <><header className="viewer-header">
          <div>
            <p className="viewer-eyebrow">{label ?? layoutNames[data.scene.layout]}</p>
            <h1>{data.author}</h1>
            {featured && <p className="viewer-featured">{featured.entry.title}</p>}
          </div>
          {!tour && <button ref={enterButton} className="visit-ticket" onClick={()=>toggleTour(true)}>
            <span><small>ADMIT ONE · {items.length} STOPS</small><strong>Enter the exhibition</strong></span><ArrowUpRight size={21}/></button>}
        </header>
        {tour ? <div id="gallery"><Visit data={data} leave={()=>toggleTour(false)}/></div> : <section className="viewer-gallery" id="gallery" aria-label="Interactive gallery and route">
          <Preview scene={data.scene} entries={data.entries} active={active} onSelect={setActive} label={palette.label} />
          <aside className="viewer-route">
            <div className="viewer-route-title"><Route size={16} /><h2>Visitor route</h2></div>
            {current && <div className="current-exhibit" aria-live="polite">
              <span><ComponentIcon id={current.exhibit.componentId} />{current.exhibit.assembly ? current.entry.kind : components[current.exhibit.componentId].label}</span>
              <h3>{current.entry.title}</h3>
              <p>{current.entry.summary}</p>
            </div>}
            <ol>
              {items.map(({ exhibit, entry, number }) => (
                <li key={exhibit.id}><button type="button" aria-current={exhibit.id === active ? "step" : undefined}
                  onClick={() => setActive(exhibit.id)}>
                  <span>{String(number).padStart(2, "0")}</span><ComponentIcon id={exhibit.componentId} size={15} />
                  <strong>{entry.title}</strong><ArrowUpRight size={13} aria-hidden="true" />
                </button></li>
              ))}
            </ol>
          </aside>
        </section>}</>}
        <section className="exhibit-index" id="exhibits">
          <header><h2>Explore the exhibits</h2><span>{items.length} {items.length === 1 ? "exhibit" : "exhibits"}</span></header>
          <div className="exhibit-groups">
            {kinds.map(kind => {
              const group = items.filter(item => item.entry.kind === kind);
              if (!group.length) return null;
              return <section key={kind} className={`exhibit-group exhibit-kind-${kind.toLowerCase()}`}>
                <h3>{sectionNames[kind]}</h3>
                {group.map(({ exhibit, entry }) => (
                  <article key={exhibit.id} className="exhibit-card">
                    <div className="exhibit-symbol"><ComponentIcon id={exhibit.componentId} size={19} /></div>
                    <div><h4>{entry.title}</h4><p>{entry.summary}</p>
                      <button type="button" onClick={() => select(exhibit.id)} aria-label={`Locate ${entry.title} in the gallery`}>Locate in gallery <ArrowUpRight size={13} /></button></div>
                  </article>
                ))}
              </section>;
            })}
          </div>
        </section>
        {notes && <div id="design"><DesignChoices scene={data.scene} entries={data.entries} notes={notes} onSelect={select} /></div>}
      </main>
    </div>
  );
}

function Demo({ data }: { data: DemoData }) {
  const [sample, setSample] = useState(0);
  const [layout, setLayout] = useState(0);
  const [treatment, setTreatment] = useState<"space" | "panels">("space");
  const selected = data.samples[sample];
  const design = selected.designs[layout];
  const showPanels = treatment === "panels" && !!design.baseline;
  const controls = (
    <section className="demo-controls" aria-label="Compare sample designs">
      <div className="demo-label"><strong>Compare designs</strong><span>Codex-prepared designs from fictional résumés</span></div>
      <div className="demo-switches">
        <div className="demo-switch" role="group" aria-label="Sample résumé">
          {data.samples.map(({ label }, i) => (
            <button key={label} type="button" aria-pressed={i === sample} onClick={() => setSample(i)}>{label}</button>
          ))}
        </div>
        <div className="demo-switch" role="group" aria-label="Layout">
          {selected.designs.map(({ portfolio }, i) => (
            <button key={portfolio.scene.layout} type="button" aria-pressed={i === layout} onClick={() => setLayout(i)}>
              {layoutNames[portfolio.scene.layout]}
            </button>
          ))}
        </div>
        {design.baseline && <div className="demo-switch" role="group" aria-label="Exhibit treatment">
          <button type="button" aria-pressed={!showPanels} onClick={() => setTreatment("space")}>Composed objects</button>
          <button type="button" aria-pressed={showPanels} onClick={() => setTreatment("panels")}>Standard panels</button>
        </div>}
      </div>
    </section>
  );
  const dataToShow = showPanels && design.baseline ? design.baseline : design.portfolio;
  return <Portfolio key={`${sample}/${layout}/${treatment}`} data={dataToShow}
    notes={showPanels ? undefined : design.notes} controls={controls} label={selected.label} />;
}

const root = createRoot(document.getElementById("root")!);
try {
  const embedded = document.getElementById("exhibit-public-data");
  const data: unknown = embedded ? JSON.parse(embedded.textContent!) : await (async () => {
    const response = await fetch("./portfolio.json");
    if (!response.ok) throw new Error("Portfolio data was not found.");
    return response.json();
  })();
  const demo = Demonstration.safeParse(data);
  if (demo.success) {
    document.title = "Career Exhibit Studio · Design comparison";
    root.render(<Demo data={demo.data} />);
  } else {
    const portfolio = Published.parse(data);
    document.title = `${portfolio.author} · Career Exhibit`;
    root.render(<Portfolio data={portfolio} />);
  }
} catch {
  root.render(<main className="viewer"><h1>Portfolio unavailable</h1><p>Request a fresh HTML export from the author. For a ZIP export, serve the entire extracted folder together.</p></main>);
}
