"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  teamId: string;
};

export default function LeaveTeamButton({ teamId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onLeave = async () => {
    if (!confirm("Вы уверены, что хотите покинуть команду?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось покинуть команду");
        return;
      }
      router.push("/teams");
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        type="button"
        onClick={onLeave}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-60 dark:border-red-700 dark:bg-neutral-900 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        {loading ? "Выход…" : "Покинуть команду"}
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

