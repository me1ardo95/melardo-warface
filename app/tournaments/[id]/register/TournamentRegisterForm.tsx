"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Team = { id: string; name: string };

type Props = { tournamentId: string; teams: Team[] };

export default function TournamentRegisterForm({ tournamentId, teams }: Props) {
  const router = useRouter();
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tournament/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournament_id: tournamentId, team_id: selectedTeamId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Не удалось зарегистрироваться");
        return;
      }
      router.push(`/tournaments/${tournamentId}`);
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  };

  if (teams.length === 0) {
    return (
      <p className="mt-4 text-neutral-500 dark:text-neutral-400">
        Вы должны быть капитаном команды, чтобы зарегистрировать её на турнир.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div>
        <label htmlFor="team" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Ваша команда
        </label>
        <select
          id="team"
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          required
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Регистрация…" : "Зарегистрировать команду"}
      </button>
    </form>
  );
}
