"use client";

import { useState } from "react";

type TeamOption = { id: string; name: string };

type Props = {
  tournamentId: string;
  tournamentName: string;
  teams: TeamOption[];
};

export function TournamentRegisterForm({
  tournamentId,
  tournamentName,
  teams,
}: Props) {
  const [teamId, setTeamId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event
  ) => {
    event.preventDefault();
    setMessage(null);

    if (!teamId) {
      setMessage("Выберите команду для регистрации.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/tournament/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: tournamentId,
          team_id: teamId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        setMessage("This team is already registered for the tournament.");
        return;
      }

      if (!res.ok) {
        if (data?.error === "Team already registered for this tournament") {
          setMessage("This team is already registered for the tournament.");
        } else if (data?.error) {
          setMessage(String(data.error));
        } else {
          setMessage(
            "Не удалось зарегистрировать команду. Попробуйте ещё раз."
          );
        }
        return;
      }

      setMessage("Команда успешно зарегистрирована на турнир.");
    } catch {
      setMessage("Ошибка сети. Попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!teams.length) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        <p>
          Зарегистрировать команду на турнир могут только{" "}
          <span className="font-semibold">капитаны команд</span>, в которых вы состоите.
        </p>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          Убедитесь, что вы авторизованы и назначены капитаном нужной команды.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div>
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Регистрация команды в турнире
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Турнир: <span className="font-medium">{tournamentName}</span>
        </p>
      </div>

      <div>
        <label
          htmlFor="team"
          className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100"
        >
          Ваша команда (вы капитан)
        </label>
        <select
          id="team"
          name="team"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none ring-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <option value="">— Выберите команду —</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {message && (
        <p className="text-sm text-neutral-700 dark:text-neutral-200">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-neutral-900"
      >
        {submitting ? "Регистрация..." : "Зарегистрировать команду"}
      </button>
    </form>
  );
}

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
