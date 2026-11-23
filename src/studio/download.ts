import { htmlPortfolio, viewerFiles, zipPortfolio } from "../domain/export.ts";
import type { PublishedPortfolio } from "../domain/scene.ts";

export const portableStudio = () => document.getElementById("studio-viewer-files") !== null;

async function viewerAssets() {
  const embedded = document.getElementById("studio-viewer-files");
  if (embedded) {
    const files: Record<string, string> = JSON.parse(embedded.textContent!);
    return Object.fromEntries(viewerFiles.map(path => [path, new TextEncoder().encode(files[path])]));
  }
  const files = await Promise.all(viewerFiles.map(async path => {
    // Resolve relative to the editor deployment so this works under a subdirectory.
    const response = await fetch(new URL(`./viewer/${path}`, window.location.href));
    if (!response.ok) throw new Error("The static viewer must be built before exporting.");
    return [path, new Uint8Array(await response.arrayBuffer())] as const;
  }));
  return Object.fromEntries(files);
}

export async function previewPortfolio(data: PublishedPortfolio) {
  return htmlPortfolio(data, await viewerAssets());
}

export async function downloadPortfolio(data: PublishedPortfolio, format: "html" | "zip") {
  const assets = await viewerAssets();
  const blob = format === "html" ? new Blob([htmlPortfolio(data, assets)], { type: "text/html;charset=utf-8" })
    : new Blob([new Uint8Array(zipPortfolio(data, assets))], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const slug = data.author.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.join("-") || "career";
  link.download = `${slug}-portfolio.${format}`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
