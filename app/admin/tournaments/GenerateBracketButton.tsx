"use client";

import { useState } from "react";

type Props = {
  tournamentId: string;
};

export function GenerateBracketButton({ tournamentId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tournament/generate-bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(
          data?.error ??
            "Не удалось сгенерировать сетку. Попробуйте позже."
        );
        return;
      }
      window.location.href = `/tournaments/${tournamentId}/bracket`;
    } catch {
      alert("Ошибка сети. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      {loading ? "Генерация…" : "Сгенерировать сетку"}
    </button>
  );
}

