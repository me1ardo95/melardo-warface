"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function QuickMatchPage() {
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState("");
  const [mode, setMode] = useState("5x5");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/team/my-teams")
      .then((r) => r.json())
      .then((data) => setTeams(data.teams ?? []))
      .catch(() => setTeams([]));
  }, []);

  const handleFindMatch = async () => {
    if (!teamId) {
      setMessage("Выберите команду");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/quick-match/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error ?? "Не удалось найти игру");
        return;
      }
      if (data?.match?.id) {
        router.push(`/matches/${data.match.id}`);
      } else {
        setMessage("Вы добавлены в очередь. Ожидайте соперника...");
      }
    } catch {
      setMessage("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
        Быстрый матч
      </h1>

      <div className="card-surface p-6">
        <p className="mb-6 text-sm text-[#B0B8C5]">
          Система автоматически найдёт соперника, создаст матч и выдаст Match
          ID, Lobby Code и Secret Phrase.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#E5E7EB]">
              Команда
            </label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full rounded-md border border-[#2A2F3A] bg-[#11141A] px-3 py-2 text-sm text-white focus:border-[#E63946] focus:outline-none focus:ring-1 focus:ring-[#E63946]"
            >
              <option value="">— Выберите команду —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#E5E7EB]">
              Размер команды
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full rounded-md border border-[#2A2F3A] bg-[#11141A] px-3 py-2 text-sm text-white focus:border-[#E63946] focus:outline-none focus:ring-1 focus:ring-[#E63946]"
            >
              {["3x3", "4x4", "5x5", "6x6", "7x7", "8x8"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {message && (
            <p className="text-sm text-[#9CA3AF]">{message}</p>
          )}

          <button
            type="button"
            onClick={handleFindMatch}
            disabled={loading || !teamId}
            className="btn-primary w-full py-3 text-sm uppercase tracking-wide disabled:opacity-60"
          >
            {loading ? "Поиск..." : "НАЙТИ ИГРУ"}
          </button>
        </div>
      </div>

      <Link
        href="/matches"
        className="inline-block text-sm text-[#F97316] hover:underline"
      >
        ← Вернуться к вызовам
      </Link>
    </div>
  );
}
