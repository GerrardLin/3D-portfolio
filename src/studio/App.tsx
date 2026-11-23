import { entranceNames, entrances } from "../domain/direction.ts";
import { useEffect, useState } from "react";
import { ArrowRight, Box, Check, ChevronRight, CloudDownload, FileText, Layers3, MoveUpRight, RotateCcw, Route, Sparkles } from "lucide-react";
import { approvedBrief, Entry, localExtraction, parsePages, ReviewedEntry, syntheticProfile, type CareerEntry, type PortfolioBrief, type ReviewEntry, type SourceBlock } from "../domain/profile.ts";
import { checkScene, layoutNames, layouts, makePublished, themes, type ExhibitSpec, type Layout, type SceneSpec } from "../domain/scene.ts";
import { localExhibition, makeDemo } from "../domain/preparedDesigns.ts";
import { DesignChoices } from "../portfolio/DesignChoices.tsx";
import { Preview } from "../portfolio/Preview.tsx";
import type { Candidate } from "../../server/agent.ts";
import { downloadPortfolio, portableStudio, previewPortfolio } from "./download.ts";
import { Inspector, origins } from "./Inspector.tsx";
import type { Recommendation } from "../../server/recommend.ts";
import { readResumeFile } from "./inputFile.ts";
import { Resume } from "./Resume.tsx";
import "./studio.css";

const sample = syntheticProfile();
const sampleBrief = approvedBrief(sample.author, "Applied AI hiring team", sample.entries);
const localDesigns = (brief: PortfolioBrief): Candidate[] => layouts.map(layout => ({
  ...localExhibition(brief, layout), origin: "local", attempts: [],
}));
function sampleDesigns(): Candidate[] {
  return makeDemo().samples[0].designs.map(({ portfolio, notes }) => ({
    scene: portfolio.scene, origin: "sample", attempts: [], design: notes,
  }));
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Try again.";

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, body === undefined ? undefined : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The studio could not complete this request.");
  return result;
}

export function App() {
  const [tab, setTab] = useState<"resume" | "studio" | "export" | "visitor">("resume");
  const [visitorPage, setVisitorPage] = useState("");
  const [modelAvailable, setModelAvailable] = useState(false);
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [recommendation,setRecommendation]=useState<Recommendation|null>(null);
  const [sourceName,setSourceName]=useState("");
  const [author, setAuthor] = useState("");
  const [audience, setAudience] = useState("");
  const [sources, setSources] = useState<SourceBlock[]>([]);
  const [review, setReview] = useState<ReviewEntry[]>([]);
  const [brief, setBrief] = useState<PortfolioBrief | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [alternative, setAlternative] = useState<Layout>("showcase");
  const [active, setActive] = useState<string | null>(null);
  const [edits, setEdits] = useState<Partial<Record<Layout, SceneSpec>>>({});

  useEffect(() => {
    if (portableStudio() && !document.querySelector('meta[name="exhibit-local-service"]')) return;
    request<{ modelAvailable: boolean }>("status").then(result => setModelAvailable(result.modelAvailable)).catch(() => {});
  }, []);

  const candidate = candidates.find(item => item.scene.layout === alternative);
  const scene = edits[alternative] ?? candidate?.scene;
  const issues = scene && brief ? checkScene(scene, brief.entries) : [];
  const inspected = scene?.exhibits.find(exhibit => exhibit.id === active) ??
    scene?.exhibits.find(exhibit => exhibit.id === scene.route[0]) ?? scene?.exhibits[0];
  const entry = brief?.entries.find(item => item.id === inspected?.entryId);
  const source = review.find(item => item.id === entry?.id);
  const exportable = !!(brief && scene && !issues.length);
  const approvedCount = review.filter(item => item.approved).length;

  useEffect(() => {
    if (tab !== "visitor" || !brief || !scene) return;
    let live = true;
    setVisitorPage("");
    void (async () => previewPortfolio(makePublished(brief, scene)))().then(html => {
      if (live) setVisitorPage(html);
    }).catch(error => {
      if (live) { setNotice({ error: true, text: errorMessage(error) }); setTab("export"); }
    });
    return () => { live = false; };
  }, [tab, brief, scene]);

  function invalidateDesigns() {
    setRecommendation(null);
    setCandidates([]);
    setBrief(null);
    setEdits({});
    setActive(null);
  }

  function onNavigate(next: typeof tab) {
    setNotice(null);
    setTab(next);
  }

  async function run(message: string, work: () => Promise<void>) {
    setNotice(null);
    setWorking(message);
    try { await work(); }
    catch (error) { setNotice({ error: true, text: errorMessage(error) }); }
    finally { setWorking(""); }
  }

  async function importPages(read: () => Promise<string[]>, ai: boolean, label:string) {
    await run(ai ? "Extracting résumé facts with AI…" : "Reading résumé text…", async () => {
      const blocks = parsePages(await read());
      const entries = ai
        ? ReviewedEntry.array().parse((await request<{ entries: unknown }>("extract", { sources: blocks })).entries)
        : localExtraction(blocks);
      setSourceName(label);
      setSources(blocks);
      setReview(entries);
      if (isSample) {
        if (author === sample.author) setAuthor("");
        if (audience === sampleBrief.audience) setAudience("");
      }
      setIsSample(false);
      invalidateDesigns();
      setNotice({ error: false, text: `Review and approve the ${entries.length} imported entries before generating designs.` });
    });
  }

  function loadSample() {
    setIsSample(true);
    setRecommendation(null);setSourceName("Fictional example");setTab("visitor");
    setAuthor(sample.author);
    setAudience(sampleBrief.audience);
    setSources(sample.sources);
    setReview(sample.entries);
    setBrief(sampleBrief);
    setCandidates(sampleDesigns());
    setAlternative("showcase");
    setEdits({});
    setActive(null);
    setNotice({ error: false, text: "Synthetic résumé loaded." });
  }

  async function generate(ai: boolean) {
    await run(ai ? "Designing and checking both galleries…" : "Composing galleries…", async () => {
      const next = approvedBrief(author, audience, review);
      const result = ai ? await request<{ candidates: Candidate[]; recommendation: Recommendation }>("design", next) : {candidates:localDesigns(next),recommendation:null};
      const designs=result.candidates;setRecommendation(result.recommendation);
      setBrief(next);
      setCandidates(designs);
      setAlternative(result.recommendation?.layout ?? "showcase");
      setEdits({});
      setActive(null);
      setTab("visitor");
    });
  }

  function editScene(update: SceneSpec) {
    setEdits(previous => ({ ...previous, [alternative]: update }));
  }

  function editExhibit(updated: ExhibitSpec) {
    if (!scene) return;
    const previous = scene.exhibits.find(exhibit => exhibit.id === updated.id);
    const route = previous?.visible === updated.visible ? scene.route
      : updated.visible ? [...scene.route, updated.id] : scene.route.filter(id => id !== updated.id);
    editScene({
      ...scene,
      route,
      exhibits: scene.exhibits.map(exhibit => exhibit.id === updated.id ? updated : exhibit),
    });
  }

  function shift(id: string, direction: number) {
    if (!scene) return;
    const from = scene.route.indexOf(id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= scene.route.length) return;
    const route = [...scene.route];
    [route[from], route[to]] = [route[to], route[from]];
    editScene({ ...scene, route });
  }

  function editEntry(updated: CareerEntry) {
    const clean = Entry.parse(updated);
    setBrief(previous => previous && ({ ...previous, entries: previous.entries.map(item => item.id === clean.id ? clean : item) }));
    setReview(previous => previous.map(item => item.id === clean.id ? { ...item, ...clean } : item));
    setNotice({ error: false, text: "Approved text updated in both designs." });
  }

  function savePortfolio(format: "html" | "zip") {
    if (!exportable || !brief || !scene) return;
    void run("Packaging your site…", async () => {
      await downloadPortfolio(makePublished(brief, scene), format);
      setNotice({ error: false, text: format === "html" ? "Visitor HTML downloaded. Open it in a browser or send it as one file." : "ZIP downloaded. Serve the extracted folder to view the site." });
    });
  }

  if (tab === "visitor") return <div className="visitor-workbench">
    <header className="visitor-tools">
      <div><span className="edition-mark" aria-hidden="true">CE</span><span><strong>Career Exhibit Studio</strong><small>{isSample ? "Fictional sample · Visitor preview" : (candidate?.origin==="fallback"?"Local fallback":candidate?.origin==="local"?"Local design":candidate?.origin==="revised"?"Revised AI design":"AI design")+" · Visitor preview"}</small></span></div>
      <nav aria-label="Author tools">
        {scene&&<label className="quick-style">Visitor style <select aria-label="Visitor style" value={scene.entrance??'gallery'} onChange={e=>editScene({...scene,entrance:e.target.value as SceneSpec["entrance"]})}>{entrances.map(id=><option key={id} value={id}>{entranceNames[id]}</option>)}</select></label>}
        <button type="button" onClick={() => onNavigate("resume")}>Import résumé</button>
        <button type="button" onClick={() => onNavigate("studio")}>Edit design</button>
        <button type="button" className="visitor-save" onClick={() => savePortfolio("html")} disabled={!!working}><CloudDownload size={15} /> Save visitor HTML</button>
      </nav>
    </header>
    {notice && <div className="notice" role={notice.error ? "alert" : "status"}>{notice.text}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification">×</button></div>}
    {visitorPage ? <iframe title="Interactive portfolio website" srcDoc={visitorPage} /> : <p role="status">Opening the exhibition…</p>}
  </div>;

  return (
    <>
      <header className="app-bar">
        <button className="brand" type="button" onClick={() => onNavigate("resume")} disabled={!!working}>
          <span className="brand-mark"><Box size={22} strokeWidth={1.8} /></span>
          <span>Career Exhibit <b>Studio</b></span>
        </button>
        <nav aria-label="Studio workflow">
          {([["resume", "Résumé", FileText], ["studio", "Design studio", Layers3], ["export", "Export", MoveUpRight]] as const)
            .map(([id, title, Icon]) => <button type="button" disabled={!!working || (id!=="resume" && !scene)}
              aria-current={tab === id ? "page" : undefined} key={id} onClick={() => onNavigate(id)}>
              <Icon size={15} />{title}
            </button>)}
        </nav>
        <button type="button" className="button button-primary bar-export" disabled={!!working || !scene} onClick={() => onNavigate("export")}>
          <CloudDownload size={16} /> Export site
        </button>
      </header>
      <main>
        {(working || notice) && <div className={`notice ${notice?.error ? "notice-error" : ""}`} role={notice?.error ? "alert" : "status"}>
          {working || notice?.text}
          {notice && !working && <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification">×</button>}
        </div>}
        {tab === "resume" && (
          <Resume sourceName={sourceName} author={author} audience={audience} entries={review} sources={sources} modelAvailable={modelAvailable} busy={!!working}
            onAuthor={value => { setAuthor(value); invalidateDesigns(); }} onAudience={value => { setAudience(value); invalidateDesigns(); }}
            onImport={(value, ai) => { void importPages(async () => [value], ai, "Pasted résumé"); }}
            onFile={(file, ai) => { void importPages(async () => readResumeFile(file), ai, file.name); }}
            onUpdate={value => { setReview(previous => previous.map(item => item.id === value.id ? value : item)); invalidateDesigns(); }}
            onGenerate={ai => { void generate(ai); }} onSample={loadSample} />
        )}
        {tab === "studio" && (
          <div className="workspace">
            <header className="page-heading">
              <div><h1>Design studio</h1><p>Edit the gallery floor below. Preview the visitor entrance to see your chosen interactive experience.</p></div>
              <div className="workspace-status">{modelAvailable ? <Sparkles size={15} /> : <Box size={15} />}
                {modelAvailable ? "AI available" : "Local mode"}</div>
            </header>
            {scene && brief && candidate ? (
              <div className="studio-grid">
                <aside className="scene-sidebar">
                  <section className="sheet design-choices">
                    <div className="section-heading"><h2>Designs</h2><Layers3 size={16} /></div>
                    {recommendation && <div className="agent-pick"><strong>{recommendation.by==='model'?'Agent recommendation':'Suggested opening'}: {layoutNames[recommendation.layout]}</strong><p>{recommendation.reason}</p><small>Based on: {brief.entries.find(e=>e.id===recommendation.entryId)?.title}</small></div>}
                    {candidates.map(item => {
                      const { layout, theme } = item.scene;
                      const palette = themes[edits[layout]?.theme ?? theme];
                      return (
                        <button className="design-option" type="button" key={layout} aria-pressed={layout === alternative}
                          onClick={() => { setAlternative(layout); setActive(null); setNotice(null); }}>
                          <span className={`layout-thumbnail ${layout}`} style={{ background: palette.floor, color: palette.accent }}>
                            <i /><i /><i /><i />
                          </span>
                          <span><b>{layoutNames[layout]}</b><small>{(edits[layout] ?? item.scene).space?.name ?? palette.label}</small></span>
                          {layout === alternative && <Check size={15} className="design-check" />}
                        </button>
                      );
                    })}
                  </section>
                  <section className="sheet design-choices"><div className="section-heading"><h2>Visitor entrance</h2></div>
                    <label>Opening experience <select value={scene.entrance ?? "gallery"} onChange={e => editScene({...scene, entrance:e.target.value as SceneSpec["entrance"]})}>{entrances.map(id=><option key={id} value={id}>{entranceNames[id]}</option>)}</select></label>
                    <button type="button" className="source-link" onClick={()=>onNavigate("visitor")} disabled={!exportable}>Preview visitor entrance <ChevronRight size={14}/></button>
                  </section>
                  <section className="sheet exhibit-list">
                    <div className="section-heading"><h2>Visitor route</h2><Route size={16} /></div>
                    {scene.route.length === 0 && <p className="muted">Show an exhibit to add a stop.</p>}
                    {scene.route.map((id, index) => {
                      const item = scene.exhibits.find(exhibit => exhibit.id === id);
                      const content = brief.entries.find(entry => entry.id === item?.entryId);
                      if (!content) return null;
                      return <button type="button" className="exhibit-link" key={id} aria-pressed={active === id} onClick={() => setActive(id)}>
                        <span>{String(index + 1).padStart(2, "0")}</span><b>{content.title}</b><ChevronRight size={14} />
                      </button>;
                    })}
                  </section>
                  <button type="button" className="source-link" onClick={() => onNavigate("resume")}>
                    <FileText size={15} /><span>{isSample ? "Synthetic résumé" : brief.author}<small>{approvedCount} approved entries</small></span><ChevronRight size={15} />
                  </button>
                </aside>
                <section className="stage-column">
                  <div className="stage-heading"><div><h2>{scene.space?.name ?? layoutNames[scene.layout]}</h2>
                    <p>{brief.author} <span>·</span> {scene.route.length} {scene.route.length === 1 ? "exhibit" : "exhibits"}</p></div>
                    <span className="count">{origins[candidate.origin]}</span>
                  </div>
                  <Preview scene={scene} entries={brief.entries} active={inspected?.visible && active ? active : null}
                    onSelect={setActive} label="Editable gallery floor" />
                  <DesignChoices scene={scene} entries={brief.entries}
                    notes={scene === candidate.scene ? candidate.design : undefined} onSelect={setActive} />
                  {edits[alternative] && <button type="button" className="reset-action" onClick={() => {
                    setEdits(previous => ({ ...previous, [alternative]: undefined }));
                    setActive(null);
                  }}><RotateCcw size={14} /> Reset layout edits</button>}
                </section>
                <Inspector scene={scene} exhibit={inspected} entry={entry} entries={brief.entries} source={source} issues={issues}
                  candidate={candidate} onExhibit={editExhibit} onEditEntry={editEntry} onSelect={setActive}
                  onShift={shift} onTheme={theme => editScene({ ...scene, theme })}
                  onViewpoint={viewpoint => scene.space && editScene({ ...scene, space: { ...scene.space, viewpoint } })} />
              </div>
            ) : (
              <section className="sheet empty-state"><Layers3 size={30} /><h2>Generate two scene designs</h2>
                <p>Review at least one résumé entry to start composing your portfolio.</p>
                <button className="button button-primary" type="button" onClick={() => onNavigate("resume")}>Review résumé <ArrowRight size={16} /></button>
              </section>
            )}
          </div>
        )}
        {tab === "export" && (
          <div className="workspace export-workspace">
            <header className="page-heading"><div><h1>Export portfolio</h1><p>Save one interactive HTML file that opens in a browser, including offline.</p></div></header>
            <section className="sheet export-sheet">
              <div className="export-icon"><CloudDownload size={26} /></div>
              <div><h2>{brief?.author ?? "Portfolio"}</h2>
                <p className="muted">{scene ? `${layoutNames[scene.layout]} · ${scene.route.length} published exhibits` : "Generate a design to prepare your portfolio."}</p>
                {exportable ? <p className="export-ok"><Check size={16} /> Scene checks passed</p>
                  : scene && <p className="export-error">Resolve {issues.length} layout {issues.length === 1 ? "issue" : "issues"} in the studio before exporting.</p>}
                <p>Share one HTML file. Visitors can open it directly, rotate the scene, and explore your approved exhibits offline. The editor, original résumé, and hidden exhibits stay out of the file.</p>
                <div className="actions">
                  <button type="button" className="button button-primary" onClick={() => savePortfolio("html")} disabled={!exportable || !!working}>
                    <CloudDownload size={16} /> Download HTML
                  </button>
                  <button type="button" className="button button-secondary" onClick={() => onNavigate("visitor")} disabled={!exportable || !!working}>Preview as visitor</button>
                  <button type="button" className="button button-secondary" onClick={() => savePortfolio("zip")} disabled={!exportable || !!working}>Download ZIP</button>
                  <button type="button" className="button button-secondary" onClick={() => onNavigate("studio")} disabled={!!working}>Back to studio</button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}
