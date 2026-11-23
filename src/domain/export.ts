import { strToU8, zipSync } from "fflate";
import type { PublishedPortfolio } from "./scene.ts";

export const viewerFiles = ["index.html", "assets/viewer.js", "assets/viewer.css"] as const;

export function jsonBlock(id: string, value: unknown) {
  return `<script id="${id}" type="application/json">${JSON.stringify(value).replace(/</gu, "\\u003c")}</script>`;
}

export function inlinePage(shell: string, js: string, css: string, blocks: string) {
  const moduleTag = /<script\b[^>]*\btype="module"[^>]*\bsrc="[^"]+"[^>]*><\/script>/iu;
  const styleTag = /<link\b[^>]*\brel="stylesheet"[^>]*>/iu;
  if (!moduleTag.test(shell) || !styleTag.test(shell) || !js.trim() || !css.trim() || !shell.includes("</body>")) {
    throw new Error("The single-file export needs a complete viewer build.");
  }
  return shell.replace(moduleTag, "").replace(styleTag, () => `<style>${css.replace(/<\/style/giu, "<\\/style")}</style>`)
    .replace("</body>", () => `${blocks}\n<script type="module">${js.replace(/<\/script/giu, "<\\/script")}</script>\n</body>`);
}

export function htmlPortfolio(data: PublishedPortfolio, assets: Record<string, Uint8Array>) {
  const [shell, js, css] = viewerFiles.map(path => new TextDecoder().decode(assets[path]));
  return inlinePage(shell, js, css, jsonBlock("exhibit-public-data", data));
}

export function zipPortfolio(data: PublishedPortfolio, assets: Record<string, Uint8Array>) {
  const files = Object.fromEntries(viewerFiles.map(path => [path, assets[path]]));
  if (Object.values(files).some(file => !file?.length)) throw new Error("The standalone viewer bundle is incomplete.");
  return zipSync({
    ...files,
    "portfolio.json": strToU8(JSON.stringify(data, null, 2)),
  }, { level: 6 });
}
