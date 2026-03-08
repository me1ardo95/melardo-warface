import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, getMatchesWithDetails } from "@/app/actions/data";
import type { Match, Team, Tournament } from "@/lib/types";
import { AdminNav } from "../AdminNav";
import { DisputedMatchActions } from "./DisputedMatchActions";

type MatchWithDetails = Match & {
  team1?: Team;
  team2?: Team;
  tournament?: Tournament;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU");
}

export default async function AdminDisputedMatchesPage() {
  const [profile, allMatchesRaw] = await Promise.all([
    getCurrentProfile(),
    getMatchesWithDetails(),
  ]);
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const allMatches = allMatchesRaw as MatchWithDetails[];
  const matches = allMatches.filter((m) => m.status === "disputed");

  return (
    <div className="min-h-screen p-6">
      <AdminNav active="disputed-matches" />

      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Спорные матчи
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Список матчей со статусом{" "}
            <span className="font-medium">&laquo;оспаривается&raquo;</span> для
            ручной проверки и принятия решения.
          </p>
        </div>

        {matches.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            Нет матчей со статусом &laquo;оспаривается&raquo;.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {matches.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                      {m.team1?.name ?? "Команда 1"} vs{" "}
                      {m.team2?.name ?? "Команда 2"}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Турнир: {m.tournament?.name ?? "—"}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Текущий счёт:{" "}
                      <span className="font-mono text-neutral-900 dark:text-neutral-50">
                        {m.score_team1} : {m.score_team2}
                      </span>
                    </div>
                    <Link
                      href={`/matches/${m.id}`}
                      className="inline-block text-xs text-blue-500 hover:underline"
                    >
                      Подробнее
                    </Link>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-col items-end gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>
                        Запланирован: {formatDate(m.scheduled_at ?? null)}
                      </span>
                      {m.completed_at && (
                        <span>
                          Завершён: {formatDate(m.completed_at ?? null)}
                        </span>
                      )}
                    </div>
                    <DisputedMatchActions
                      matchId={m.id}
                      team1Name={m.team1?.name ?? "Команда 1"}
                      team2Name={m.team2?.name ?? "Команда 2"}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

