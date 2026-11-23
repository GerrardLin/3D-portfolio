import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, AudioLines, BookOpen, Headphones, RotateCcw, ScanLine } from "lucide-react";
import { Stage } from "./Stage.tsx";
import type { PublicCase } from "./model.ts";
import { makeAudio, modes, reachable, samples } from "./simulation.ts";

function AudioExperiment({mode,setMode,playing,setPlaying}:{mode:number;setMode:(n:number)=>void;playing:boolean;setPlaying:(v:boolean)=>void}) {
  const context=useRef<AudioContext|null>(null);
  const active=useRef<AudioBufferSourceNode|null>(null);
  const [error,setError]=useState("");
  function stop(){
    if(active.current){active.current.onended=null;active.current.stop();active.current=null;}
    setPlaying(false);
  }
  useEffect(()=>()=>{if(active.current){active.current.onended=null;active.current.stop();}void context.current?.close();},[]);
  async function play(){
    if(playing){stop();return;}
    setError("");
    try {
      context.current ??=new AudioContext();
      await context.current.resume();
      const node=context.current.createBufferSource();
      node.buffer=makeAudio(context.current,mode);
      node.connect(context.current.destination);
      node.onended=()=>{if(active.current===node){active.current=null;setPlaying(false);}};
      active.current=node;
      node.start();
      setPlaying(true);
    } catch {setError("浏览器未能播放音频。你仍可比较下方的波形。");}
  }
  return <>
    <div className="controls presets" aria-label="采样精度">{modes.map((m,i)=><button key={m.title} aria-pressed={mode===i} onClick={()=>{stop();setMode(i);}}><b>{m.title}</b><small>{m.tag}</small></button>)}</div>
    <div className="wave-line"><AudioLines size={18}/><div className="wave" aria-hidden="true">{Array.from({length:81},(_,i)=><i key={i} style={{height:(3+Math.abs(samples(mode,.058+i*.00041))*34)+"px"}}/>)}</div><button className="play" onClick={()=>void play()}><Headphones size={16}/>{playing?"停止":"试听"}</button></div>
    <div className="lab-note">原创合成音 · 仅模拟采样和量化，不含实际唱片的机械噪声。</div>
    {error&&<div role="status">{error}</div>}
  </>;
}

export function CaseView({data,back,custom=false,actions}:{data:PublicCase;back?:()=>void;custom?:boolean;actions?:React.ReactNode}) {
  const [intro, setIntro] = useState(!!data.profile);
  const [ranked, setRanked] = useState<number[]>([]);
  const activity = data.activity;
  const stageKind = activity && activity.type !== "investigate" ? activity.type : data.kind;
  const priority = activity?.type === "priority";
  const [reading,setReading]=useState(false),[mode,setMode]=useState(0),[playing,setPlaying]=useState(false);
  const [layout,setLayout]=useState<"central"|"distributed">("central"),[offline,setOffline]=useState(false);
  const [choice,choose]=useState<number|null>(null),[revealed,reveal]=useState(false),[seen,setSeen]=useState<number[]>([]);
  const results=reachable(layout,offline);
  const revealHeading=useRef<HTMLHeadingElement>(null);
  const clueRefs=useRef<(HTMLDetailsElement|null)[]>([]);
  function openClue(i:number){
    const item=clueRefs.current[i];
    if(item){item.open=true;item.querySelector("summary")?.focus({preventScroll:true});}
  }
  const labId="lab-title";
  function reset(){setRanked([]);choose(null);reveal(false);setSeen([]);setMode(0);setLayout("central");setOffline(false);setPlaying(false);}
  const chosen = priority ? ranked[0] : choice ?? undefined;
  const feedback = chosen === undefined ? undefined : data.feedback?.[chosen];
  const referencedClue = feedback?.clue === undefined ? undefined : data.clues[feedback.clue];
  const chooseOption = (index: number) => {
    if (!priority) return choose(index);
    setRanked(items => items.includes(index) ? items.filter(item => item !== index) : [...items, index]);
  };
  const launch = () => {
    setIntro(false);
    setReading(false);
    requestAnimationFrame(() => document.getElementById("case-title")?.focus());
  };
  const revealBody=<><h2 ref={revealHeading} tabIndex={-1}>{custom?"作者当时的做法":data.author + " 当时的做法"}</h2><p>{data.reveal}</p>{data.outcome && <p><strong>观察到的结果</strong><br/>{data.outcome}</p>}<div className="transfer"><span>带走一个方法</span><p>{data.takeaway}</p></div><div className="sources">{data.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer"><BookOpen size={15}/>{source.label}<ArrowRight size={14}/></a>)}</div></>;
  return <main className={"case-page "+data.kind}>
    <header className="site-top">
      {back ? <button className="brand" onClick={back}><span className="brand-mark">↳</span>换你来做</button> :
        <span className="brand"><span className="brand-mark">↳</span>{data.author}</span>}
      <div className="header-actions">
        {back && <button onClick={back}><ArrowLeft size={15}/>{custom ? "继续编辑" : "案例"}</button>}
        {data.profile && !intro && <button onClick={() => { setIntro(true); setReading(false); setPlaying(false); }}>个人简介</button>}
        {!intro && <button aria-pressed={reading} onClick={() => { setReading(!reading); setPlaying(false); }}><BookOpen size={15}/>{reading ? "返回体验" : "文字版"}</button>}
        {actions}
      </div>
    </header>
    {intro ? <section className="profile" aria-labelledby="profile-author">
      <p className="eyebrow">个人简介</p><h1 id="profile-author">{data.author}</h1>
      {data.profile?.headline && <p className="profile-headline">{data.profile.headline}</p>}
      <div className="profile-project"><p className="eyebrow">代表经历</p><h2>{data.title}</h2>
        <p>{data.context}</p>
        {data.role && <p><strong>我的职责</strong> {data.role}</p>}
        {data.outcome && <p><strong>观察到的结果</strong> {data.outcome}</p>}
      </div>
      <div className="profile-actions"><button className="solid" onClick={launch}>亲手试一次我的工作</button>
        <button className="outline" onClick={() => { setIntro(false); setReading(true); }}>阅读项目过程</button>
        {data.profile?.link && <a href={data.profile.link.url}>{data.profile.link.label}</a>}
      </div>
    </section> : reading ? <section className="reading"><p className="eyebrow">履历摘录 · {data.author}</p><h1>{data.title}</h1><p>{data.context}</p>
      {data.role && <p><strong>作者职责</strong> {data.role}</p>}
      {data.clues.map(clue => <p key={clue.label}><strong>{clue.label}</strong> {clue.text}</p>)}
      {revealBody}</section> :
      <div className="case-grid">
        <section className="brief">
          <p className="eyebrow">{custom?"作者提供资料":"公开履历案例"} <span>/</span> {data.author}</p>
          <h1 id="case-title" tabIndex={-1}>{data.title}</h1>
          <p className="context">{data.context}</p>
          <div className="evidence">
            <span className="eyebrow"><ScanLine size={15}/>可调查的线索</span>
            {data.clues.map((c,i)=><details ref={element=>{clueRefs.current[i]=element;}} key={i} onToggle={e=>{if(e.currentTarget.open)setSeen(previous=>previous.includes(i)?previous:[...previous,i]);}}><summary>{c.label}<span>＋</span></summary><p>{c.text}</p></details>)}
          </div>
        </section>
        <section className="lab" aria-labelledby={labId}>
          <div className="lab-top"><h2 id={labId}>{stageKind==="record"?"唱机实验台":stageKind==="web"?"网络实验台":stageKind==="priority"?"排序桌":stageKind==="compare"?"对照台":"线索板"}</h2>
            <span>{stageKind === "evidence" ? "点击档案卡查阅线索" : "拖动查看"}</span></div>
          <Stage kind={stageKind} mode={mode} playing={playing} layout={layout} offline={offline}
            clueLabels={stageKind === "priority" ? data.options : activity?.type === "compare" ? activity.views.map(view => view.label) : data.clues.map(clue => clue.label)}
            seen={seen} openClue={openClue} ranked={ranked}
            onPick={stageKind === "priority" && !revealed ? chooseOption : stageKind === "compare" ? setMode : undefined}/>
          {stageKind==="evidence" && <div className="controls">{data.clues.map((clue,i)=><button key={i} onClick={()=>openClue(i)}>{clue.label}</button>)}</div>}
          {activity?.type === "priority" && <p className="lab-note">在下方或排序桌依次选择行动。再点一次可移除。</p>}
          {activity?.type === "compare" && <div className="comparison-detail">
            <p className="lab-note">{activity.aspect}</p>
            <div className="controls" aria-label="对比对象">{activity.views.map((view, i) =>
              <button key={i} aria-pressed={mode === i} onClick={() => setMode(i)}>{view.label}</button>)}</div>
            <p aria-live="polite">{activity.views[mode]?.observation}</p>
          </div>}
          {data.kind==="record"&&<AudioExperiment key={String(revealed)} mode={mode} setMode={setMode} playing={playing} setPlaying={setPlaying}/>}
          {data.kind==="web"&&<>
            <div className="controls web-controls" aria-label="网络架构"><button aria-pressed={layout==="central"} onClick={()=>setLayout("central")}>集中式索引</button><button aria-pressed={layout==="distributed"} onClick={()=>setLayout("distributed")}>分布式直连</button><button className="cut" aria-pressed={offline} onClick={()=>setOffline(!offline)}>{offline?"恢复中间节点":"断开中间节点"}</button></div>
            <p className="web-result" aria-live="polite">仍可访问 <b>{results.filter(Boolean).length} / 3</b> <span>{["VM/CMS","VAX/VMS","Unix"].filter((_,i)=>results[i]).join(" · ")||"—"}</span></p>
            <p className="lab-note">演示假设：集中式访问依赖中间节点。分布式方案中，断开的主机内容也会失联。</p>
          </>}
        </section>
        <section className="decision">
          {revealed ? <>
            <div className="your-choice">
              <span>{priority ? "你的顺序" : "你的选择"}</span>
              <p>{priority ? ranked.map(index => data.options[index]).join(" → ") : data.options[choice!]}</p>
            </div>
            {feedback && <div className="choice-feedback"><h3>{priority ? "关于你优先处理的事项" : "关于你的选择"}</h3>
              <p>{feedback.text}</p>
              {referencedClue && <details><summary>重看线索 · {referencedClue.label}</summary><p>{referencedClue.text}</p></details>}
            </div>}
            <div className="reveal">{revealBody}</div>
            <div className="next-row"><button onClick={reset}><RotateCcw size={14}/>重玩本案例</button>
              {back && <button onClick={back}>{custom ? "继续编辑" : "探索其他案例"}</button>}</div>
          </> : <>
            <div className="decision-head"><h2>{data.question}</h2></div>
            {activity?.type === "priority" && <p className="decision-constraint">{activity.constraint}</p>}
            <div className="choices">{data.options.map((option, index) => {
              const position = ranked.indexOf(index);
              return <button key={index} aria-pressed={priority ? position !== -1 : choice === index} onClick={() => chooseOption(index)}>
                <span>{priority ? position === -1 ? "＋" : position + 1 : String.fromCharCode(65 + index)}</span>{option}
              </button>;
            })}</div>
            <button className="solid" disabled={priority ? ranked.length < 2 : choice === null} onClick={() => {
              setPlaying(false);
              reveal(true);
              requestAnimationFrame(() => revealHeading.current?.focus());
            }}>{priority ? "提交排序并揭晓" : "提交选择并揭晓"}<ArrowRight size={17}/></button>
          </>}
        </section>
      </div>}
    <footer>换你来做 <span>{data.author}</span></footer>
  </main>;
}
