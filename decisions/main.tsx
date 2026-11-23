import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowRight, AudioLines, CircuitBoard } from "lucide-react";
import { Stage } from "./Stage.tsx";
import { originalCases } from "./cases.ts";
import { CaseView } from "./CaseView.tsx";
import { Studio } from "./Studio.tsx";
import { ExportActions } from "./publication.tsx";
import type { PublicCase } from "./model.ts";
import "./styles.css";

function App() {
  const [current, setCurrent] = useState<PublicCase | null>(null);
  const [editing, setEditing] = useState(false);
  function backToEditor() {
    setCurrent(null);
    window.scrollTo(0, 0);
  }
  if (editing) return <>
    <div hidden={!!current}><Studio back={() => setEditing(false)} preview={data => {
      setCurrent(data);
      window.scrollTo(0, 0);
    }}/></div>
    {current && <CaseView key={current.id} data={current} custom back={backToEditor} actions={<ExportActions data={current}/>}/>}
  </>;
  if (current) return <CaseView key={current.id} data={current} back={backToEditor} actions={<ExportActions data={current}/>}/>;
  return <main className="home">
    <header className="site-top"><span className="brand"><span className="brand-mark">↳</span>换你来做</span><button onClick={()=>setEditing(true)}>打开作者工作台<ArrowRight size={16}/></button></header>
    <div className="home-grid">
      <div className="hero"><p className="eyebrow">互动履历 · 决策实验</p><h1>换你<span>来做。</span></h1><p>进入简历里的一次真实判断。亲手试一试，再看当事人发现了什么。</p><button className="outline" onClick={()=>{setCurrent(originalCases[0]);}}>先试一个案例<ArrowRight size={17}/></button></div>
      <div className="cover-lab"><Stage kind="record" mode={0} playing={false} layout="central" offline={false}/></div>
    </div>
    <div className="case-list">{originalCases.map(data=><button key={data.id} onClick={()=>{setCurrent(data);}}>{data.kind==="record"?<AudioLines size={25}/>:<CircuitBoard size={25}/>}<span><small>{data.author} · {data.kind==="record"?"数字制造":data.kind==="web"?"系统设计":"虚构案例 · 软件验收"}</small><strong>{data.title}</strong></span><ArrowRight size={20}/></button>)}</div>
    <footer>换你来做 · COMP7607A Group 23 <span>互动履历工作台</span></footer>
  </main>;
}

createRoot(document.getElementById("root")!).render(<App/>);
