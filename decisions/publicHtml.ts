import { jsonBlock } from "../src/domain/export.ts";
import { PublicCase } from "./model.ts";

type Sharing = { url?: string; image?: string };

function escapeMarkup(value: string) {
  return value.replace(/[&<>"']/gu, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character] ?? character));
}

export function httpAddress(value: string) {
  try {
    const url = new URL(value);
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return url.href;
  } catch {
    return undefined;
  }
}

export function renderVisitor(shell: string, data: PublicCase, sharing: Sharing = {}) {
  const content = PublicCase.parse(data);
  const name = escapeMarkup(content.author + " · " + content.title);
  const description = escapeMarkup(content.profile?.headline || content.context);
  const url = sharing.url && httpAddress(sharing.url);
  const image = sharing.image && httpAddress(sharing.image);
  const metadata = [
    `<meta name="description" content="${description}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${name}">`,
    `<meta property="og:description" content="${description}">`,
    url && `<link rel="canonical" href="${escapeMarkup(url)}"><meta property="og:url" content="${escapeMarkup(url)}">`,
    image && `<meta property="og:image" content="${escapeMarkup(image)}"><meta name="twitter:card" content="summary_large_image">`,
  ].filter(Boolean).join("\n");
  return shell
    .replace("<title>换你来做</title>", () => `<title>${name}</title>`)
    .replace("<!-- public-metadata -->", () => metadata)
    .replace("<!-- public-case -->", () => jsonBlock("public-case", content));
}
