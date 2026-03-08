"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  matchId: string;
  team1Name: string;
  team2Name: string;
};

export function DisputedMatchActions({
  matchId,
  team1Name,
  team2Name,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const router = useRouter();

  const resolve = async () => {
    const s1 = parseInt(score1, 10);
    const s2 = parseInt(score2, 10);
    if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 < 0 || s2 < 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/match/resolve-disputed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          score_team1: s1,
          score_team2: s2,
        }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
      >
        Зафиксировать результат
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Итоговый счёт
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              {team1Name} vs {team2Name}
            </p>
            <div className="mt-4 flex gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  {team1Name}
                </label>
                <input
                  type="number"
                  min={0}
                  value={score1}
                  onChange={(e) => setScore1(e.target.value)}
                  className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  {team2Name}
                </label>
                <input
                  type="number"
                  min={0}
                  value={score2}
                  onChange={(e) => setScore2(e.target.value)}
                  className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={resolve}
                disabled={loading || score1 === "" || score2 === ""}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "…" : "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
