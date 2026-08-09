import { OLLAMA_BASE_URL, OLLAMA_MODEL, SYSTEM_PROMPT } from "@/lib/ollama";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json();

  const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      stream: true,
    }),
  });

  if (!ollamaRes.ok || !ollamaRes.body) {
    const detail = await ollamaRes.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: "Ollama request failed", detail }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(ollamaRes.body, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
