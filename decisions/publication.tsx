import { useState } from "react";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { PublicCase } from "./model.ts";
import { httpAddress, renderVisitor } from "./publicHtml.ts";

export function downloadFile(content: string | Uint8Array<ArrayBuffer>, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function visitorShell() {
  const encoded = document.getElementById("visitor-shell")?.textContent;
  if (!encoded) throw new Error("请使用构建好的工作台导出。");
  const bytes = Uint8Array.from(atob(JSON.parse(encoded)), char => char.charCodeAt(0));
  const template = unzipSync(bytes)["visitor.html"];
  if (!template) throw new Error("缺少访客模板。");
  return strFromU8(template);
}

export function ExportActions({ data }: { data: PublicCase }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");
  const [status, setStatus] = useState("");
  const fileName = data.author.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/gu, "") || "portfolio";

  function save(asSite: boolean) {
    const sharing = { url: url.trim(), image: image.trim() };
    if (asSite && Object.values(sharing).some(value => value && !httpAddress(value))) {
      setStatus("页面地址和封面如有填写，请使用有效的 https:// 或 http:// 链接。");
      return;
    }
    try {
      const html = renderVisitor(visitorShell(), data, asSite ? sharing : undefined);
      if (asSite) {
        downloadFile(zipSync({ "index.html": strToU8(html) }), fileName + "-site.zip", "application/zip");
        setStatus("已生成静态网站包。解压后，将 index.html 上传到你的静态托管空间即可分享网址。");
      } else {
        downloadFile(html, fileName + ".html", "text/html;charset=utf-8");
        setStatus("已生成离线 HTML。");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "导出失败，请再试一次。");
    }
  }
  return <div className="publication">
    <button aria-expanded={open} onClick={() => setOpen(!open)}>导出与分享</button>
    {open && <section className="share-panel" aria-label="导出与分享">
      <h2>导出访客网站</h2>
      <button onClick={() => save(false)}>下载离线 HTML</button>
      <label>计划使用的网址（可选）<input type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…"/></label>
      <label>封面图片网址（可选）<input type="url" value={image} onChange={event => setImage(event.target.value)} placeholder="https://…"/></label>
      <button onClick={() => save(true)}>下载静态网站 ZIP</button>
      <p>发布后可用新版 index.html 更新页面，也可在托管空间撤下页面。</p>
      {status && <p role="status">{status}</p>}
    </section>}
  </div>;
}
