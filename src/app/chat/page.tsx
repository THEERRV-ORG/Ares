"use client";

import { useEffect, useRef, useState } from "react";
import { Flame, Send } from "lucide-react";
import { ParticleNetworkBackground } from "@/components/ui/particle-network-background";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming) return;

    setError(null);
    setInput("");

    const userMessage: Message = { id: newId(), role: "user", content: text };
    const assistantId = newId();
    const history = [...messages, userMessage];

    setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const chunk = JSON.parse(line) as { message?: { content?: string }; error?: string };
          if (chunk.error) throw new Error(chunk.error);
          content += chunk.message?.content ?? "";
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content } : m)),
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong talking to Ollama.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="relative flex h-full w-full flex-col bg-black pl-16">
      <ParticleNetworkBackground className="z-0" />
      <div className="absolute inset-0 left-16 z-0 bg-black/40" />

      <header className="relative z-10 flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-6">
        <Flame className="h-5 w-5 text-orange-400" />
        <span className="text-base font-medium text-white/90">Ares — Personal Assistant</span>
      </header>

      {hasMessages ? (
        <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-5 py-3 text-lg leading-relaxed ${
                    m.role === "user"
                      ? "rounded-tr-sm bg-orange-500 text-white"
                      : "rounded-tl-sm border border-white/10 bg-white/5 text-white/95 backdrop-blur-sm"
                  }`}
                >
                  {m.content || (isStreaming && m.role === "assistant" ? "…" : "")}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-1 items-center justify-center text-center text-white/40">
          <p className="text-lg">Ask Ares anything to get started.</p>
        </div>
      )}

      {error && (
        <div className="relative z-10 mx-auto mb-2 max-w-3xl px-4 text-sm text-red-400">{error}</div>
      )}

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-4">
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-md focus-within:border-orange-500/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={1}
            placeholder="Message Ares…"
            className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-base text-white placeholder:text-white/40 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white transition-colors enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            title="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
