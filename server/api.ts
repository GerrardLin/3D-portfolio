import { Interview } from "../decisions/model.ts";
import { interview, suggestEpisodes } from "./interview.ts";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { Brief, MAX_SOURCE_LENGTH, Source } from "../src/domain/profile.ts";
import { layouts } from "../src/domain/scene.ts";
import { designOne, extract } from "./agent.ts";
import { recommend } from "./recommend.ts";
import type { CallModel } from "./model.ts";

export const SourcesRequest = z.object({ sources: z.array(Source).min(1).max(150) }).refine(({ sources }) =>
  new Set(sources.map(({ id }) => id)).size === sources.length &&
  sources.reduce((sum, source) => sum + source.text.length, 0) <= MAX_SOURCE_LENGTH,
);

const BODY_LIMIT = 500_000;
async function readBody(req: IncomingMessage) {
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > BODY_LIMIT) {
      req.resume();
      throw new Error("The submitted content is too large.");
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

export function middleware(callModel?: CallModel) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = req.url?.split("?")[0];
    if (!path?.startsWith("/api/")) return next();
    if (req.method === "GET" && path === "/api/status") return json(res, 200, { modelAvailable: !!callModel });
    if (!["/api/extract", "/api/design", "/api/interview", "/api/episodes"].includes(path)) return json(res, 404, { error: "Unknown endpoint." });
    if (req.method !== "POST") return json(res, 405, { error: "Use POST." });
    if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json") {
      return json(res, 415, { error: "Use application/json." });
    }
    if (!callModel) return json(res, 503, { error: "A model gateway is not configured." });
    let body: unknown;
    try {
      body = await readBody(req);
    } catch {
      return json(res, 400, { error: "The request must contain valid JSON within the size limit." });
    }

    if (path === "/api/extract") {
      const input = SourcesRequest.safeParse(body);
      if (!input.success) return json(res, 400, { error: "The source blocks are invalid." });
      try {
        return json(res, 200, { entries: await extract(input.data.sources, callModel) });
      } catch {
        return json(res, 502, { error: "AI extraction did not return usable entries with matching quotes. Try local extraction or retry." });
      }
    }
    if (path === "/api/interview" || path === "/api/episodes") {
      const input = Interview.safeParse(body);
      if (!input.success) return json(res, 400, { error: "请输入展示姓名和简历正文。" });
      try {
        const result = path === "/api/episodes"
          ? await suggestEpisodes(input.data, callModel)
          : await interview(input.data, callModel);
        return json(res, 200, result);
      } catch {
        return json(res, 502, { error: "模型暂时无法返回采访结果。请检查接口设置，或继续手动编辑。" });
      }
    }
    const brief = Brief.safeParse(body);
    if (!brief.success) return json(res, 400, { error: "Approve at least one valid résumé entry." });
    try {
      const candidates = await Promise.all(layouts.map(layout => designOne(brief.data, layout, callModel)));
      return json(res, 200, { candidates, recommendation: await recommend(brief.data, candidates, callModel) });
    } catch {
      return json(res, 502, { error: "No valid designs could be generated." });
    }
  };
}
