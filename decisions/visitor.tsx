import { createRoot } from "react-dom/client";
import { CaseView } from "./CaseView.tsx";
import { PublicCase } from "./model.ts";
import "./styles.css";

function readCase(): PublicCase | undefined {
  try {
    const value = JSON.parse(document.getElementById("public-case")?.textContent ?? "null");
    const parsed = PublicCase.safeParse(value);
    if (parsed.success) return parsed.data;
  } catch {
    return undefined;
  }
}
const data = readCase();
createRoot(document.getElementById("root")!).render(data
  ? <CaseView data={data} custom={data.kind === "evidence"}/>
  : <main className="reading"><h1>无法读取此案例</h1><p>请重新导出文件。</p></main>);
