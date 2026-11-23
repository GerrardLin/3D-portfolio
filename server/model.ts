import { z } from "zod";

export type CallModel = (system: string, payload: unknown) => Promise<unknown>;
export type ModelConfig = { baseUrl: string; apiKey?: string; model: string };

export function modelConfig(env: Record<string, string | undefined>): ModelConfig | undefined {
  const { MODEL_BASE_URL, MODEL_NAME, MODEL_API_KEY } = env;
  if (!MODEL_BASE_URL || !MODEL_NAME) return;
  const url = new URL(MODEL_BASE_URL);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!local && !MODEL_API_KEY) return;
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("MODEL_BASE_URL must use HTTPS or a local HTTP address.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("MODEL_BASE_URL must be a plain API base URL.");
  }
  return { baseUrl: url.href.replace(/\/$/u, ""), apiKey: MODEL_API_KEY, model: MODEL_NAME };
}

const Completion = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

export function createModel(config: ModelConfig): CallModel {
  return async (system, payload) => {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      redirect: "error",
      headers: { "Content-Type": "application/json", ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}) },
      body: JSON.stringify({
        model: config.model,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(payload) }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`Model gateway returned HTTP ${response.status}.`);
    const { choices } = Completion.parse(await response.json());
    const content = choices[0].message.content.trim().replace(/^\x60{3}(?:json)?\s*|\s*\x60{3}$/giu, "");
    return JSON.parse(content) as unknown;
  };
}
