import { mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "vite";
import { htmlPortfolio, inlinePage, jsonBlock, viewerFiles } from "../src/domain/export.ts";
import { makeDemo } from "../src/domain/preparedDesigns.ts";

const viewer = Object.fromEntries(await Promise.all(viewerFiles.map(async path => [path, await readFile(`public/viewer/${path}`, "utf8")])));
const bundles = await build({ configFile: false, base: "./", publicDir: false, build: {
  write: false, target: "esnext", assetsInlineLimit: () => true, cssCodeSplit: false, modulePreload: false,
  rollupOptions: { output: { inlineDynamicImports: true } },
} });
if (!("output" in bundles)) throw new Error("Expected a single studio build.");
const js = bundles.output.find(item => item.type === "chunk" && item.isEntry);
const css = bundles.output.find(item => item.fileName.endsWith(".css"));
const shell = bundles.output.find(item => item.fileName === "index.html");
if (bundles.output.length !== 3 || js?.type !== "chunk" || css?.type !== "asset" || shell?.type !== "asset") {
  throw new Error("The portable studio must embed every dependency, including its PDF worker.");
}
const studio = inlinePage(String(shell.source), js.code, String(css.source), jsonBlock("studio-viewer-files", viewer));
const sample = htmlPortfolio(makeDemo().samples[0].designs[0].portfolio,
  Object.fromEntries(viewerFiles.map(path => [path, new TextEncoder().encode(viewer[path])])));
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/Career-Exhibit-Studio.html", studio);
await writeFile("artifacts/Maya-Chen-Portfolio.html", sample);
console.log("Created the standalone studio and a visitor-only portfolio in artifacts/.");
