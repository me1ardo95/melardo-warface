"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  tournamentId: string;
  tournamentName: string;
};

export function DeleteTournamentButton({ tournamentId, tournamentName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (
      !confirm(`Удалить турнир «${tournamentName}»? Это действие нельзя отменить.`)
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert((data as { error?: string })?.error ?? "Не удалось удалить турнир.");
        return;
      }

      router.refresh();
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
      className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-60 dark:border-red-900 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950"
    >
      {loading ? "…" : "Удалить"}
    </button>
  );
}
