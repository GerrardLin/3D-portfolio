import { useRef, useState } from "react";
import { ArrowRight, Check, FileText, FileUp, Sparkles } from "lucide-react";
import { kinds, type ReviewEntry, type SourceBlock } from "../domain/profile.ts";

export function Resume({ sourceName, author, audience, entries, sources, modelAvailable, busy, onAuthor, onAudience, onImport, onFile, onUpdate, onGenerate, onSample }: {
  sourceName: string;
  author: string;
  audience: string;
  entries: ReviewEntry[];
  sources: SourceBlock[];
  modelAvailable: boolean;
  busy: boolean;
  onAuthor(value: string): void;
  onAudience(value: string): void;
  onImport(value: string, ai: boolean): void;
  onFile(file: File, ai: boolean): void;
  onUpdate(value: ReviewEntry): void;
  onGenerate(ai: boolean): void;
  onSample(): void;
}) {
  const [value, setValue] = useState("");
  const [aiExtract, setAiExtract] = useState(false);
  const approved = entries.filter(entry => entry.approved).length;
  const picker=useRef<HTMLInputElement>(null);
  const [paste,setPaste]=useState(false),[over,setOver]=useState(false);
  return (
    <div className="workspace resume-workspace maker">
      <header className="maker-heading"><div><span className="maker-overline">PORTFOLIO MAKER</span><h1>Turn your résumé into a 3D portfolio.</h1><p>Start with your own file. Review the content, edit the scene and download an interactive HTML to share.</p></div>
        {!entries.length&&<button type="button" className="button button-secondary" onClick={onSample} disabled={busy}><FileText size={16}/> Explore a fictional example</button>}
      </header>
      <div className="resume-grid">
        <section className="sheet resume-input">
          <div className="section-heading"><h2>Import your résumé</h2><FileUp size={19}/></div>
          <div className={'maker-drop'+(over?' dragging':'')} onDragOver={e=>{e.preventDefault();if(!busy)setOver(true);}} onDragLeave={()=>setOver(false)} onDrop={e=>{e.preventDefault();setOver(false);const f=e.dataTransfer.files[0];if(f&&!busy)onFile(f,aiExtract);}}>
            <FileUp size={30}/><strong>{sourceName||'Drop your résumé here'}</strong><span>Text-based PDF, Word (.docx) or plain text</span><button type="button" className="button button-primary" disabled={busy} onClick={()=>picker.current?.click()}>{entries.length?'Replace file':'Choose a file'}</button>
            <input ref={picker} type="file" aria-label="Upload résumé file" accept=".pdf,.docx,.txt" hidden disabled={busy} onChange={e=>{const file=e.currentTarget.files?.[0];if(file)onFile(file,aiExtract);e.currentTarget.value='';}}/>
          </div>
          <button type="button" className="text-mode" aria-expanded={paste} disabled={busy} onClick={()=>setPaste(!paste)}>{paste?'Close text input':'Paste résumé text instead'}</button>
          {paste&&<><label>Paste résumé text<textarea rows={6} value={value} onChange={e=>setValue(e.target.value)} disabled={busy} placeholder="Separate entries with a blank line."/></label><button type="button" className="button button-secondary" disabled={!value.trim()||busy} onClick={()=>onImport(value,aiExtract)}>Import text</button></>}
          <div className="maker-engine"><strong>{modelAvailable?'Model gateway configured':'Local composer · no model connected'}</strong>
            {modelAvailable?<label className="check-label"><input type="checkbox" checked={aiExtract} disabled={busy} onChange={e=>setAiExtract(e.target.checked)}/>Use AI to extract facts when importing. This sends the résumé text to the configured model.</label>:<p>The local version uses rules. For AI extraction and scene planning, start the generator with a configured model.</p>}
          </div>
          <label>Portfolio name<input value={author} maxLength={80} onChange={e => onAuthor(e.target.value)} placeholder="Name to display" disabled={busy}/></label>
          <label>Intended audience <span className="optional">Optional</span><input value={audience} maxLength={160} onChange={e=>onAudience(e.target.value)} placeholder="E.g. design hiring team" disabled={busy}/></label>
          {!!sources.length && <p className="muted">{sources.length} source {sources.length===1?'block':'blocks'} loaded.</p>}
        </section>
        <section className="sheet review-list">
          {!!entries.length?<div className="section-heading"><h2>Review facts</h2><span className="count">{approved} approved</span></div>:<div className="maker-guide"><span className="maker-overline">YOUR WORKFLOW</span><h2>From a document to a place to explore.</h2><ol>
            <li><b>Review the evidence</b><p>Compare each proposed entry with its source. Choose what visitors may see.</p></li>
            <li><b>Shape the exhibition</b><p>Compare a project showcase with a career timeline. Edit the objects, text and visiting order.</p></li>
            <li><b>Share one HTML</b><p>Your visitor can open the 3D résumé offline. No editor, account or model key is needed.</p></li>
          </ol></div>}
          {entries.map(entry => {
            const source = sources.find(block => block.id === entry.sourceId);
            return (
              <article key={entry.id} className={`review-entry ${entry.approved ? "entry-approved" : ""}`}>
                <label className="entry-title-label">Title<input aria-label={`Title for ${entry.id}`} maxLength={80} value={entry.title}
                  onChange={e => onUpdate({ ...entry, title: e.target.value, approved: false })} disabled={busy} /></label>
                <label>Category<select value={entry.kind} onChange={e => onUpdate({ ...entry, kind: e.target.value as ReviewEntry["kind"], approved: false })} disabled={busy}>
                  {kinds.map(kind => <option key={kind}>{kind}</option>)}
                </select></label>
                <label className="review-summary">Public summary<textarea rows={2} maxLength={360} value={entry.summary}
                  onChange={e => onUpdate({ ...entry, summary: e.target.value, approved: false })} disabled={busy} /></label>
                <details className="review-source" open={!entry.approved}>
                  <summary><FileText size={14} /> Source excerpt{sourceName.toLowerCase().endsWith(".pdf") ? ` · Page ${source?.page ?? "?"}` : ""}</summary>
                  <blockquote>{entry.quote}</blockquote>
                  {source && source.text !== entry.quote && <details><summary>Full source block</summary><p>{source.text}</p></details>}
                </details>
                <label className="check-label review-approve">
                  <input type="checkbox" checked={entry.approved} disabled={busy || !entry.title.trim() || !entry.summary.trim() || !source}
                    onChange={e => onUpdate({ ...entry, approved: e.target.checked })} />
                  {entry.approved ? <><Check size={14} /> Approved for publication</> : "Approve for publication"}
                </label>
              </article>
            );
          })}
          {modelAvailable && !!entries.length && <p className="muted">Generate with AI sends the approved entries, portfolio name and intended audience to the configured model.</p>}
          {!!entries.length && <div className="actions review-actions">
            <button type="button" className={`button ${modelAvailable ? "button-secondary" : "button-primary"}`}
              disabled={!approved || busy} onClick={() => onGenerate(false)}>Compose locally <ArrowRight size={16} /></button>
            {modelAvailable && <button type="button" className="button button-primary" disabled={!approved || busy} onClick={() => onGenerate(true)}>
              <Sparkles size={16} /> Generate with AI
            </button>}
          </div>}
        </section>
      </div>
    </div>
  );
}
