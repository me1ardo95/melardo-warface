"use client";

import { useEffect, useRef, useState } from "react";

type Props = { clanId: string };

type Message = {
  id: string;
  message: string;
  created_at: string;
  profile?: { warface_nick?: string | null; display_name?: string | null };
};

export default function ClanChat({ clanId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    setLoading(true);
    const res = await fetch(`/api/clan/chat?clan_id=${clanId}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadMessages();
    const t = setInterval(loadMessages, 10000);
    return () => clearInterval(t);
  }, [clanId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const msg = input.trim();
    if (!msg || sending) return;
    setSending(true);
    const res = await fetch("/api/clan/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clan_id: clanId, message: msg }),
    });
    setSending(false);
    setInput("");
    if (res.ok) loadMessages();
    else {
      const d = await res.json();
      alert(d.error ?? "Ошибка отправки");
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9CA3AF]">
        Чат клана
      </h2>
      <div className="card-surface flex flex-col rounded-xl overflow-hidden">
        <div className="h-64 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <p className="text-center text-[#9CA3AF]">Загрузка...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-[#9CA3AF]">Нет сообщений</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="text-[#F97316]">
                  {m.profile?.warface_nick ?? m.profile?.display_name ?? "—"}:
                </span>{" "}
                <span className="text-[#E5E7EB]">{m.message}</span>
                <span className="ml-2 text-xs text-[#6B7280]">
                  {new Date(m.created_at).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2 border-t border-[#2A2F3A] p-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Сообщение..."
            maxLength={2000}
            className="flex-1 rounded-lg border border-[#2A2F3A] bg-[#0A0C0F] px-4 py-2 text-white focus:border-[#F97316] focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="btn-primary px-4 py-2 text-sm"
          >
            {sending ? "..." : "Отправить"}
          </button>
        </div>
      </div>
    </section>
  );
}
