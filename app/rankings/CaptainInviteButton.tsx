"use client";

import { useState } from "react";

type Props = {
  teamId: string | null;
  playerNick: string | null;
};

export default function CaptainInviteButton({ teamId, playerNick }: Props) {
  const [loading, setLoading] = useState(false);

  if (!teamId || !playerNick) return null;

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, userNick: playerNick }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Не удалось отправить приглашение");
        return;
      }
      alert("Приглашение отправлено");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
    >
      {loading ? "Отправка…" : "Пригласить в команду"}
    </button>
  );
}

