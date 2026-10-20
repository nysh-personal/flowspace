// Server-only MiniMax client (user's own Token Plan key, OpenAI-compatible API).
export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export class AiError extends Error {}

export async function minimaxChat(messages: ChatMsg[]): Promise<string> {
  const key = process.env["MINIMAX_API_KEY"];
  if (!key) throw new AiError("The MiniMax key isn't set up yet.");
  const res = await fetch("https://api.minimax.io/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "MiniMax-M2", messages, reasoning_split: true }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("MiniMax error", res.status, body.slice(0, 500));
    if (res.status === 401) throw new AiError("MiniMax rejected the API key. Please update it.");
    if (res.status === 429) throw new AiError("MiniMax is rate limiting requests. Try again in a moment.");
    throw new AiError("The AI service is unavailable right now. Try again shortly.");
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    base_resp?: { status_code?: number; status_msg?: string };
  };
  if (json.base_resp?.status_code && json.base_resp.status_code !== 0) {
    console.error("MiniMax base_resp", json.base_resp);
    throw new AiError(json.base_resp.status_msg || "The AI request failed.");
  }
  const text = json.choices?.[0]?.message?.content ?? "";
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/g, "");
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (start < 0 || end < start) throw new AiError("The AI returned an unexpected answer. Try again.");
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    throw new AiError("The AI returned an unexpected answer. Try again.");
  }
}
