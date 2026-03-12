"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Confirmation = {
  team_id: string;
  score_team1: number;
  score_team2: number;
  screenshot_url: string;
  team?: { name: string } | null;
};

type Props = {
  matchId: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  confirmations: Confirmation[];
};

const PENALTY_REASONS = [
  { value: "false_result", label: "Ложный результат" },
  { value: "missing_screenshot", label: "Отсутствие скриншота" },
  { value: "cheating", label: "Мошенничество" },
  { value: "other", label: "Другое" },
] as const;

export function DisputedMatchActions({
  matchId,
  team1Id,
  team2Id,
  team1Name,
  team2Name,
  confirmations,
}: Props) {
  const [mode, setMode] = useState<"menu" | "approve" | "change" | "reject" | "penalty">("menu");
  const [loading, setLoading] = useState(false);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [useTeamId, setUseTeamId] = useState<string | null>(null);
  const [penaltyTeamId, setPenaltyTeamId] = useState<string | null>(null);
  const [penaltyReason, setPenaltyReason] = useState<string>("other");
  const router = useRouter();

  const callResolve = async (body: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/match/resolve-disputed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId, ...body }),
      });
      if (res.ok) {
        setMode("menu");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (!useTeamId) return;
    callResolve({ action: "approve", use_team_id: useTeamId });
  };

  const handleChangeScore = () => {
    const s1 = parseInt(score1, 10);
    const s2 = parseInt(score2, 10);
    if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 < 0 || s2 < 0) return;
    callResolve({
      action: "change_score",
      score_team1: s1,
      score_team2: s2,
    });
  };

  const handleReject = () => {
    if (!confirm("Отклонить результат и отменить матч?")) return;
    callResolve({ action: "reject" });
  };

  const handlePenalty = async () => {
    if (!penaltyTeamId || !confirm("Выдать штраф -50 рейтинга команде?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/match/penalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          team_id: penaltyTeamId,
          reason: penaltyReason,
        }),
      });
      if (res.ok) {
        setMode("menu");
        setPenaltyTeamId(null);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const conf1 = confirmations.find((c) => c.team_id === team1Id);
  const conf2 = confirmations.find((c) => c.team_id === team2Id);

  if (mode === "menu") {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setMode("approve")}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
        >
          Принять результат
        </button>
        <button
          type="button"
          onClick={() => setMode("change")}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Изменить счёт
        </button>
        <button
          type="button"
          onClick={() => setMode("penalty")}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
        >
          Выдать штраф
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={loading}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          Отклонить
        </button>
      </div>
    );
  }

  if (mode === "penalty") {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
          Штраф -50 рейтинга
        </span>
        <span className="text-xs text-neutral-500">Выберите команду:</span>
        <button
          type="button"
          onClick={() => setPenaltyTeamId(team1Id)}
          className={`rounded px-2 py-1 text-xs text-left ${
            penaltyTeamId === team1Id ? "bg-amber-600 text-white" : "bg-neutral-200 dark:bg-neutral-700"
          }`}
        >
          {team1Name}
        </button>
        <button
          type="button"
          onClick={() => setPenaltyTeamId(team2Id)}
          className={`rounded px-2 py-1 text-xs text-left ${
            penaltyTeamId === team2Id ? "bg-amber-600 text-white" : "bg-neutral-200 dark:bg-neutral-700"
          }`}
        >
          {team2Name}
        </button>
        <select
          value={penaltyReason}
          onChange={(e) => setPenaltyReason(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-800"
        >
          {PENALTY_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("menu");
              setPenaltyTeamId(null);
            }}
            className="text-xs text-neutral-500 hover:underline"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handlePenalty}
            disabled={loading || !penaltyTeamId}
            className="rounded bg-amber-600 px-2 py-1 text-xs text-white disabled:opacity-60"
          >
            {loading ? "…" : "Выдать штраф"}
          </button>
        </div>
      </div>
    );
  }

  if (mode === "approve") {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
          Выберите результат команды:
        </span>
        {conf1 && (
          <button
            type="button"
            onClick={() => setUseTeamId(team1Id)}
            className={`rounded px-2 py-1 text-xs ${
              useTeamId === team1Id
                ? "bg-emerald-600 text-white"
                : "bg-neutral-200 dark:bg-neutral-700"
            }`}
          >
            {team1Name}: {conf1.score_team1} : {conf1.score_team2}
          </button>
        )}
        {conf2 && (
          <button
            type="button"
            onClick={() => setUseTeamId(team2Id)}
            className={`rounded px-2 py-1 text-xs ${
              useTeamId === team2Id
                ? "bg-emerald-600 text-white"
                : "bg-neutral-200 dark:bg-neutral-700"
            }`}
          >
            {team2Name}: {conf2.score_team1} : {conf2.score_team2}
          </button>
        )}
        {(!conf1 && !conf2) && (
          <span className="text-xs text-neutral-500">Нет подтверждений</span>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("menu"); setUseTeamId(null); }}
            className="text-xs text-neutral-500 hover:underline"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading || !useTeamId}
            className="rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-60"
          >
            {loading ? "…" : "Подтвердить"}
          </button>
        </div>
      </div>
    );
  }

  if (mode === "change") {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
          Новый счёт:
        </span>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={0}
            max={100}
            value={score1}
            onChange={(e) => setScore1(e.target.value)}
            placeholder={team1Name}
            className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          />
          <span className="text-neutral-500">:</span>
          <input
            type="number"
            min={0}
            max={100}
            value={score2}
            onChange={(e) => setScore2(e.target.value)}
            placeholder={team2Name}
            className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("menu"); setScore1(""); setScore2(""); }}
            className="text-xs text-neutral-500 hover:underline"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleChangeScore}
            disabled={loading || score1 === "" || score2 === ""}
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white disabled:opacity-60"
          >
            {loading ? "…" : "Применить"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
