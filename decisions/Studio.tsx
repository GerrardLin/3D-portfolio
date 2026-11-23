import { useEffect, useLayoutEffect, useState } from "react";
import { readResumeFile } from "../src/studio/inputFile.ts";
import { Editorial, Interview, PublicCase, Recommendations, activityLabels, checkEditorial, matchingQuote } from "./model.ts";
import type { Draft } from "./model.ts";
import { blankProject, loadProject, Project, storageKey } from "./project.ts";
import { downloadFile } from "./publication.tsx";

type Activity = NonNullable<Draft["activity"]>;
const evidenceLabels: Record<string, string> = {
  context: "情境", reveal: "作者行动", role: "个人职责", outcome: "观察到的结果", constraint: "排序约束",
  "clue-1": "线索 1", "clue-2": "线索 2", "clue-3": "线索 3", "comparison-1": "原型 A", "comparison-2": "原型 B",
};
const defaultActivity: Record<Activity["type"], Activity> = {
  investigate: { type: "investigate" },
  priority: { type: "priority", constraint: "" },
  compare: { type: "compare", aspect: "", views: [{ label: "", observation: "" }, { label: "", observation: "" }] },
};

export function Studio({ back, preview }: { back: () => void; preview: (data: PublicCase) => void }) {
  const [project, setProject] = useState(loadProject);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState<"upload" | "episodes" | "interview" | null>(null);
  const [message, setMessage] = useState("");
  const [storageMessage, setStorageMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [checkedFields, setCheckedFields] = useState<string[]>([]);
  const { draft, author, résumé, story } = project;
  const activity = draft.activity ?? defaultActivity.investigate;
  const canAsk = available && consent && !!author.trim() && !!résumé.trim();
  const review = project.review?.status === "draft" ? project.review : undefined;
  const needsReview = !!review && review.evidence.some(item => !checkedFields.includes(item.field));

  useEffect(() => {
    if (location.protocol === "file:") return;
    void fetch("/api/status").then(response => response.json()).then(data => setAvailable(data.modelAvailable === true)).catch(() => {});
  }, []);

  useLayoutEffect(() => {
    try {
      const serialized = JSON.stringify(project);
      if (serialized === JSON.stringify(blankProject())) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, serialized);
      setStorageMessage("草稿保存在此浏览器。");
    } catch {
      setStorageMessage("浏览器无法保存草稿。可下载项目备份。");
    }
  }, [project]);

  function update(value: Partial<Project>) {
    setProject(current => ({ ...current, ...value }));
    setVerified(false);
    setCheckedFields([]);
  }

  function edit(value: Partial<Draft>) {
    update({ draft: { ...draft, ...value } });
  }

  function editMaterial(value: Partial<Pick<Project, "author" | "résumé" | "story">>) {
    update("résumé" in value ? { ...value, candidates: undefined, candidate: undefined, followup: undefined, review: undefined } : value);
  }

  async function importResume(file: File) {
    setBusy("upload");
    setMessage("");
    try {
      const extracted = (await readResumeFile(file)).join("\n\n").trim();
      if (!extracted) throw new Error("未提取到文字。请粘贴简历正文，扫描件可先识别文字。");
      editMaterial({ résumé: extracted.slice(0, 16000) });
      setMessage(extracted.length > 16000 ? "已导入前 16,000 字，请核对并补充需要的段落。" : "已提取简历文字，可以先删去联系资料或敏感信息。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败，请尝试粘贴正文。");
    } finally {
      setBusy(null);
    }
  }

  async function useAgent(step: "episodes" | "interview") {
    if (!canAsk || busy) return;
    setBusy(step);
    setMessage("");
    try {
      const input = Interview.parse({ author, résumé, story, candidate: project.candidate, followup: project.followup });
      const response = await fetch("/api/" + step, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "请求失败");
      if (step === "episodes") {
        const { candidates } = Recommendations.parse(payload);
        if (!candidates.every(item => matchingQuote(item, input))) throw new Error("推荐经历缺少对应的原文。");
        update({ candidates, candidate: undefined, followup: undefined });
        setMessage("请选择一段经历，再回答对应的问题。");
      } else {
        const result = Editorial.parse(payload);
        if (result.status === "question") {
          update({ followup: result.question });
          setMessage("已收到追问。补充后可继续生成。");
        } else {
          if (checkEditorial(result, input).length) throw new Error("草稿的证据或互动配置有误。");
          update({ draft: result.case, followup: undefined, review: result });
          setMessage("互动草稿已替换右侧内容。请核对事实、试做一次互动，再导出。");
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "采访暂时不可用。");
    } finally {
      setBusy(null);
    }
  }

  async function restore(file: File) {
    try {
      if (file.size > 250_000) throw new Error("文件过大。");
      const saved = Project.parse(JSON.parse(await file.text()));
      setProject(saved);
      setConsent(false);
      setVerified(false);
      setCheckedFields([]);
      setMessage("项目已恢复。");
    } catch {
      setMessage("无法恢复，请选择此工作台导出的项目 JSON。");
    }
  }

  function openPreview() {
    if (!verified || needsReview || busy) return;
    const feedback = draft.feedback?.some(entry => entry.text.trim()) ? draft.feedback : undefined;
    const data = PublicCase.safeParse({
      ...draft, activity, feedback, role: draft.role?.trim() || undefined, outcome: draft.outcome?.trim() || undefined,
      id: "decision", kind: "evidence", author,
      profile: {
        headline: project.headline.trim() || undefined,
        link: project.link.trim() ? { label: project.linkLabel.trim() || "作品与联系", url: project.link } : undefined,
      },
      sources: project.sources.filter(source => source.label.trim() || source.url.trim()),
    });
    if (!data.success) {
      const issue = data.error.issues[0];
      const labels: Record<string, string> = {
        author: "展示姓名", title: "标题", context: "情境", question: "问题", options: "行动选项",
        clues: "线索", reveal: "当时的行动", takeaway: "可复用的方法", profile: "个人主页链接",
        sources: "公开来源（标题与链接）", activity: "互动设置", feedback: "选择反馈",
      };
      const field = labels[String(issue.path[0])];
      setMessage(field ? `请检查「${field}」并补全信息。链接使用 https:// 或 http://。` : issue.message);
      return;
    }
    preview(data.data);
  }

  function setOptions(options: string[], feedback = draft.feedback) {
    edit({ options, feedback });
  }

  function setClues(clues: Draft["clues"], removed?: number) {
    const feedback = draft.feedback?.map(item => {
      if (removed === undefined || item.clue === undefined) return item;
      return { ...item, clue: item.clue === removed ? undefined : item.clue > removed ? item.clue - 1 : item.clue };
    });
    edit({ clues, feedback });
  }

  const field = (label: string, key: "title" | "context" | "question" | "reveal" | "takeaway" | "role" | "outcome", max: number) =>
    <label>{label}<textarea aria-label={label} value={draft[key] ?? ""} maxLength={max} onChange={event => edit({ [key]: event.target.value })}/></label>;

  return <main className="studio">
    <header className="site-top"><button className="brand" onClick={back}><span className="brand-mark">↳</span>换你来做</button>
      <button onClick={back}>返回案例</button></header>
    <section className="studio-intro"><h1>作者工作台</h1><p>选一段真实经历，把当时的判断做成访客可以亲手尝试的项目。</p>
      <div className="project-tools">
        <button disabled={!!busy} onClick={() => downloadFile(JSON.stringify(project, null, 2), "your-turn-project.json", "application/json")}>下载项目备份</button>
        <label className="file-button">恢复项目<input type="file" accept=".json,application/json" disabled={!!busy} onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void restore(file);
        }}/></label>
        <button disabled={!!busy} onClick={() => {
          if (!window.confirm("清除此浏览器里的草稿？你可以先下载项目备份。")) return;
          setProject(blankProject());
          setConsent(false);
          setVerified(false);
          setCheckedFields([]);
          setMessage("已清除本机草稿。");
        }}>清除草稿</button>
        <small>{storageMessage} 项目备份含简历原文，供本人留存。</small>
      </div>
    </section>
    <div className="studio-columns">
      <section><fieldset disabled={!!busy}>
        <legend>采访材料</legend>
        <label>展示姓名<input value={author} maxLength={80} onChange={event => editMaterial({ author: event.target.value })}/></label>
        <label>上传简历文件<input type="file" accept=".pdf,.docx,.txt" onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void importResume(file);
        }}/></label>
        <label>简历正文<textarea aria-label="简历正文" rows={7} maxLength={16000} value={résumé} onChange={event => editMaterial({ résumé: event.target.value })}/></label>
        {available ? <>
          <label className="approve"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}/>
            同意将姓名、简历正文和补充材料发送到已配置的模型</label>
          <button className="outline" disabled={!canAsk || !!busy} onClick={() => void useAgent("episodes")}>请 AI 推荐经历</button>
        </> : <p className="lab-note">模型接口待配置。可以直接编辑右侧内容。</p>}
        {project.candidates?.map(candidate => <section className="episode-card" key={candidate.title}>
          <h3>{candidate.title}</h3><p>{candidate.reason}</p><blockquote>{candidate.quote}</blockquote>
          <button aria-pressed={project.candidate === candidate.title} onClick={() => update({
            candidate: candidate.title, followup: candidate.question,
          })}>{project.candidate === candidate.title ? "已选此经历" : "选择这段经历"}</button>
        </section>)}
        <p className="followup">{project.followup ?? "你依据什么做了决定？当时考虑过什么选项？后来亲自做了什么？"}</p>
        <label>补充材料<textarea aria-label="补充材料" rows={5} maxLength={5000} value={story} onChange={event => editMaterial({ story: event.target.value })}/></label>
        {available && <button className="solid" disabled={!canAsk || !!busy || !project.candidate} onClick={() => void useAgent("interview")}>生成互动草稿</button>}
        {busy && <p role="status">{busy === "upload" ? "正在提取正文…" : "正在分析材料…"}</p>}
        {review && <details className="evidence-audit" open={needsReview || undefined}>
          <summary>逐项核对模型引用的原文</summary>
          {review.evidence.map(item => {
            const matches = matchingQuote(item, { author, résumé, story });
            const checked = checkedFields.includes(item.field);
            return <div className="edit-card" key={item.field}>
              <p><b>{evidenceLabels[item.field]}</b> · {item.quote}</p>
              {!matches && <p>此片段已不在当前材料中，请重新生成或根据自己的原始资料核对右侧内容。</p>}
              <label className="approve"><input type="checkbox" checked={checked} onChange={event => {
                setCheckedFields(event.target.checked
                  ? [...checkedFields, item.field]
                  : checkedFields.filter(field => field !== item.field));
                setVerified(false);
              }}/>已核对{evidenceLabels[item.field]}</label>
            </div>;
          })}
        </details>}
      </fieldset>
      <fieldset disabled={!!busy}>
        <legend>个人网站资料</legend>
        <label>一句话简介<input value={project.headline} maxLength={105} onChange={event => update({ headline: event.target.value })}/></label>
        <label>个人主页或联系页面<input type="url" value={project.link} maxLength={500} placeholder="https://…" onChange={event => update({ link: event.target.value })}/></label>
        <label>链接名称<input value={project.linkLabel} maxLength={100} onChange={event => update({ linkLabel: event.target.value })}/></label>
        {project.sources.map((source, index) => <div className="edit-card" key={index}>
          <label>来源 {index + 1} 名称<input value={source.label} maxLength={100} onChange={event => update({
            sources: project.sources.map((item, n) => n === index ? { ...item, label: event.target.value } : item),
          })}/></label>
          <label>来源 {index + 1} 链接<input type="url" value={source.url} maxLength={500} onChange={event => update({
            sources: project.sources.map((item, n) => n === index ? { ...item, url: event.target.value } : item),
          })}/></label>
          <button onClick={() => update({ sources: project.sources.filter((_, n) => n !== index) })}>移除来源</button>
        </div>)}
        {project.sources.length < 3 && <button className="outline" onClick={() => update({ sources: [...project.sources, { label: "", url: "" }] })}>添加公开来源</button>}
      </fieldset></section>
      <section><fieldset disabled={!!busy}>
        <legend>访客体验</legend>
        {field("标题", "title", 100)}{field("情境", "context", 420)}{field("我的职责", "role", 140)}
        <label>互动方式<select value={activity.type} onChange={event => edit({ activity: defaultActivity[event.target.value as Activity["type"]] })}>
          {Object.entries(activityLabels).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select></label>
        {activity.type === "priority" && <label>排序约束<textarea value={activity.constraint} maxLength={180}
          onChange={event => edit({ activity: { ...activity, constraint: event.target.value } })}/></label>}
        {activity.type === "compare" && <>
          <label>共同的对照条件<input value={activity.aspect} maxLength={100}
            onChange={event => edit({ activity: { ...activity, aspect: event.target.value } })}/></label>
          {activity.views.map((view, index) => {
            function replace(patch: Partial<typeof view>) {
              if (activity.type !== "compare") return;
              const views: typeof activity.views = [...activity.views];
              views[index] = { ...view, ...patch };
              edit({ activity: { ...activity, views } });
            }
            return <div className="edit-card" key={index}>
              <label>原型 {index + 1} 名称<input maxLength={55} value={view.label} onChange={event => replace({ label: event.target.value })}/></label>
              <label>原型 {index + 1} 的实际观察<textarea maxLength={200} value={view.observation} onChange={event => replace({ observation: event.target.value })}/></label>
            </div>;
          })}
        </>}
        {field("访客需要回答的问题", "question", 220)}
        {draft.clues.map((clue, index) => <div className="edit-card" key={index}>
          <label>线索 {index + 1} 标题<input maxLength={65} value={clue.label}
            onChange={event => setClues(draft.clues.map((item, n) => n === index ? { ...item, label: event.target.value } : item))}/></label>
          <label>线索 {index + 1} 正文<textarea maxLength={320} value={clue.text}
            onChange={event => setClues(draft.clues.map((item, n) => n === index ? { ...item, text: event.target.value } : item))}/></label>
          {draft.clues.length > 1 && <button onClick={() => setClues(draft.clues.filter((_, n) => n !== index), index)}>移除线索</button>}
        </div>)}
        {draft.clues.length < 3 && <button className="outline" onClick={() => setClues([...draft.clues, { label: "", text: "" }])}>增加线索</button>}
        {draft.options.map((option, index) => {
          const feedback = draft.feedback?.[index] ?? { text: "" };
          function setFeedback(patch: Partial<typeof feedback>) {
            edit({ feedback: draft.options.map((_, n) => n === index ? { ...feedback, ...patch } : draft.feedback?.[n] ?? { text: "" }) });
          }
          return <div className="edit-card" key={index}>
            <label>行动 {index + 1}<input maxLength={92} value={option} onChange={event => setOptions(draft.options.map((item, n) => n === index ? event.target.value : item))}/></label>
            <label>选择此行动的反馈<textarea maxLength={220} value={feedback.text} onChange={event => setFeedback({ text: event.target.value })}/></label>
            <label>关联线索<select value={feedback.clue ?? ""} onChange={event => setFeedback({ clue: event.target.value === "" ? undefined : Number(event.target.value) })}>
              <option value="">无需关联</option>{draft.clues.map((clue, n) => <option key={n} value={n}>{clue.label || "线索 " + (n + 1)}</option>)}
            </select></label>
            {draft.options.length > 2 && <button onClick={() => setOptions(draft.options.filter((_, n) => index !== n), draft.feedback?.filter((_, n) => index !== n))}>移除此行动</button>}
          </div>;
        })}
        {draft.options.length < 3 && <button className="outline" onClick={() => setOptions([...draft.options, ""], [...(draft.feedback ?? draft.options.map(() => ({ text: "" }))), { text: "" }])}>增加行动</button>}
        {field("我当时的实际行动", "reveal", 620)}
        {field("观察到的结果（可留空）", "outcome", 180)}
        {field("访客可复用的方法", "takeaway", 210)}
        <label className="approve"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)}/>
          我已核对公开资料，并确认互动中的假设与实际发生的行动、结果有明确区分。</label>
        {needsReview && <p className="lab-note">请在采访材料中逐项核对 AI 引用的原文。</p>}
        <button className="solid" disabled={!verified || needsReview || !!busy} onClick={openPreview}>打开访客预览</button>
      </fieldset></section>
    </div>
    {message && <p className="status" role="status">{message}<button onClick={() => setMessage("")} aria-label="关闭通知">×</button></p>}
  </main>;
}
