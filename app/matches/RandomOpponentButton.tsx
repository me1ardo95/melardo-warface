"use client";

import { useState } from "react";

type Props = {
  teamId: string | null;
};

export function RandomOpponentButton({ teamId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!teamId) {
      alert("Сначала выберите или создайте свою команду.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        "/api/challenge/public/list?random=true",
        { method: "GET" }
      );
      const data = (await res.json().catch(() => [])) as any[];
      if (!res.ok) {
        alert(
          (data as any)?.error ??
            "Не удалось получить список доступных вызовов"
        );
        return;
      }
      const candidates = data.filter(
        (c) => c.team_id && c.team_id !== teamId
      );
      if (candidates.length === 0) {
        alert("Нет доступных вызовов для случайного соперника.");
        return;
      }
      const chosen =
        candidates[Math.floor(Math.random() * candidates.length)];

      const acceptRes = await fetch(
        "/api/challenge/public/accept",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeId: chosen.id,
            teamId,
          }),
        }
      );
      const acceptData = await acceptRes.json().catch(() => ({}));
      if (!acceptRes.ok) {
        alert(
          acceptData?.error ??
            "Не удалось принять вызов. Попробуйте ещё раз."
        );
        return;
      }
      alert("Случайный вызов принят! Матч создан.");
      window.location.reload();
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
      className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 py-3 text-base font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
    >
      🎲 {loading ? "Поиск соперника..." : "Случайный соперник"}
    </button>
  );
}

