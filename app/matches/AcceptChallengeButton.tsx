"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  challengeId: string;
  onAccepted?: () => void;
};

export function AcceptChallengeButton({ challengeId, onAccepted }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAccept = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/challenge/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challengeId, status: "accepted" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Ошибка");
      onAccepted?.();
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не удалось принять вызов");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAccept}
      disabled={loading}
      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
    >
      {loading ? "Принятие…" : "Принять вызов"}
    </button>
  );
}
