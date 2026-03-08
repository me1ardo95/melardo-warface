"use client";

import { useState } from "react";

type Props = {
  challengeId: string;
  myTeamId: string | null;
  isOwn: boolean;
};

export function AcceptPublicChallengeButton({
  challengeId,
  myTeamId,
  isOwn,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!myTeamId) {
      alert("Сначала выберите или создайте свою команду.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/challenge/public/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, teamId: myTeamId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Не удалось принять вызов");
        return;
      }
      alert("Вызов принят! Матч создан.");
      window.location.reload();
    } catch {
      alert("Ошибка сети. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  if (isOwn) {
    return (
      <span className="text-xs text-neutral-500 dark:text-neutral-400">
        Ваш вызов
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || !myTeamId}
      className="btn-primary text-xs uppercase tracking-wide"
    >
      {loading ? "Создаём матч..." : "Играем?"}
    </button>
  );
}

