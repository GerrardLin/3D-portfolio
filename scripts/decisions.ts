import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { strToU8, zipSync } from "fflate";
import { build } from "vite";
import { inlinePage, jsonBlock } from "../src/domain/export.ts";
import { originalCases } from "../decisions/cases.ts";
import { renderVisitor } from "../decisions/publicHtml.ts";

async function shell(entry: string, blocks: string) {
  const result = await build({
    root: resolve("decisions"),
    configFile: false,
    base: "./",
    publicDir: false,
    logLevel: "warn",
    build: {
      write: false,
      target: "esnext",
      cssCodeSplit: false,
      assetsInlineLimit: () => true,
      modulePreload: false,
      rollupOptions: { input: resolve("decisions", entry), output: { inlineDynamicImports: true } },
    },
  });
  if (!("output" in result)) throw Error("Expected one offline build");
  const javascript = result.output.find(item => item.type === "chunk" && item.isEntry);
  const css = result.output.find(item => item.type === "asset" && item.fileName.endsWith(".css"));
  const document = result.output.find(item => item.type === "asset" && item.fileName === entry);
  if (!javascript || javascript.type !== "chunk" || css?.type !== "asset" || document?.type !== "asset" || result.output.length !== 3) {
    throw Error("The offline bundle has unexpected assets: " + entry);
  }
  return inlinePage(String(document.source), javascript.code, String(css.source), blocks);
}

const visitor = await shell("visitor.html", "<!-- public-case -->");
const visitorArchive = zipSync({ "visitor.html": strToU8(visitor) });
const author = await shell("index.html", jsonBlock("visitor-shell", Buffer.from(visitorArchive).toString("base64")));
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/Your-Turn.html", author);
for (const data of originalCases) {
  await writeFile("artifacts/Your-Turn-" + data.id + ".html", renderVisitor(visitor, data));
}
