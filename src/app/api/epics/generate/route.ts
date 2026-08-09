import { EPIC_GENERATION_SYSTEM_PROMPT, OLLAMA_BASE_URL, OLLAMA_MODEL } from "@/lib/ollama";

export const runtime = "nodejs";

interface EpicDraft {
  title: string;
  description: string;
}

function isEpicDraft(value: unknown): value is EpicDraft {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as EpicDraft).title === "string" &&
    typeof (value as EpicDraft).description === "string"
  );
}

export async function POST(req: Request) {
  const { requirement }: { requirement?: string } = await req.json();

  if (!requirement || !requirement.trim()) {
    return Response.json({ error: "Requirement text is required" }, { status: 400 });
  }

  const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: EPIC_GENERATION_SYSTEM_PROMPT },
        { role: "user", content: requirement },
      ],
    }),
  });

  if (!ollamaRes.ok) {
    const detail = await ollamaRes.text().catch(() => "");
    return Response.json({ error: "Ollama request failed", detail }, { status: 502 });
  }

  const data: { message?: { content?: string } } = await ollamaRes.json();
  const raw = data.message?.content ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return Response.json(
      { error: "Model did not return valid JSON. Try regenerating." },
      { status: 502 },
    );
  }

  if (!isEpicDraft(parsed)) {
    return Response.json(
      { error: "Model response was missing title/description. Try regenerating." },
      { status: 502 },
    );
  }

  return Response.json(parsed);
}
