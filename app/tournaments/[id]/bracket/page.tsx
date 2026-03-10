import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTournament, getCurrentProfile } from "@/app/actions/data";
import type { Match } from "@/lib/types";

type BracketTeam = { id: string; name: string };

type BracketMatch = {
  id: string;
  match_id: string | null;
  round: number;
  position: number;
  team1: BracketTeam | null;
  team2: BracketTeam | null;
};

type BracketRound = {
  round: number;
  matches: BracketMatch[];
};

type BracketData = {
  type: "single_elimination";
  rounds: BracketRound[];
};

type Props = { params: Promise<{ id: string }> };

export default async function TournamentBracketPage({ params }: Props) {
  const { id } = await params;
  const [tournament, profile] = await Promise.all([
    getTournament(id),
    getCurrentProfile(),
  ]);

  if (!tournament) notFound();

  const bracket = (tournament.bracket_data ?? null) as BracketData | null;

  if (!bracket || !Array.isArray(bracket.rounds) || bracket.rounds.length === 0) {
    return (
      <div className="min-h-screen p-6">
        <nav className="mb-6 flex items-center gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <Link
            href="/tournaments"
            className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            Турниры
          </Link>
          <Link
            href={`/tournaments/${id}`}
            className="font-medium text-neutral-900 dark:text-neutral-100"
          >
            {tournament.name}
          </Link>
        </nav>
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Сетка плей-офф для этого турнира пока не сгенерирована.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const matchIds = Array.from(
    new Set(
      bracket.rounds
        .flatMap((r) => r.matches)
        .map((m) => m.match_id)
        .filter((id): id is string => !!id)
    )
  );

  let matchesById = new Map<string, Match>();

  if (matchIds.length > 0) {
    const { data } = await supabase
      .from("matches")
      .select("*")
      .in("id", matchIds);
    (data ?? []).forEach((m) => {
      matchesById.set(m.id as string, m as Match);
    });
  }

  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-screen p-6">
      <nav className="mb-6 flex items-center gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <Link
          href="/tournaments"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Турниры
        </Link>
        <Link
          href={`/tournaments/${id}`}
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          {tournament.name}
        </Link>
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          Сетка
        </span>
      </nav>

      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Сетка плей-офф — {tournament.name}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Формат: Олимпийская система. Победитель матча проходит в следующий
          раунд.
        </p>

        {isAdmin && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Ручное редактирование сетки (перетаскивание команд) можно добавить
            позже. Сейчас отображается сгенерированная структура.
          </p>
        )}

        <div className="mt-4 overflow-x-auto">
          <div className="flex gap-6">
            {bracket.rounds.map((round) => (
              <div
                key={round.round}
                className="min-w-[220px] rounded-xl border border-neutral-800 bg-[#11141A] p-4"
              >
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
                  Раунд {round.round}
                </h2>
                <ul className="mt-3 space-y-3 text-sm">
                  {round.matches.map((match) => {
                    const dbMatch = match.match_id
                      ? matchesById.get(match.match_id)
                      : undefined;
                    const isCompleted = dbMatch?.status === "completed";
                    const scoreText =
                      isCompleted && dbMatch
                        ? `${dbMatch.score_team1} : ${dbMatch.score_team2}`
                        : "—";

                    return (
                      <li
                        key={match.id}
                        className="rounded-lg border border-neutral-700 bg-black/40 p-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-white">
                              {match.team1?.name ?? "—"}
                            </span>
                            <span className="text-xs text-neutral-400">
                              {round.round === 1 ? "1/8" : ""}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-white">
                              {match.team2?.name ?? "—"}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
                            <span>Счёт: {scoreText}</span>
                            {match.match_id && (
                              <Link
                                href={`/matches/${match.match_id}`}
                                className="text-xs font-medium text-blue-400 hover:text-blue-300"
                              >
                                Подробнее
                              </Link>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

