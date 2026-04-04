import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getMatchesWithDetails } from "@/app/actions/data";
import type { Match, Team, Tournament } from "@/lib/types";
import { DisputedMatchActions } from "./DisputedMatchActions";

type MatchWithDetails = Match & {
  team1?: Team;
  team2?: Team;
  tournament?: Tournament;
};

type ConfirmationRow = {
  team_id: string;
  score_team1: number;
  score_team2: number;
  screenshot_url: string;
  team?: { name: string } | null;
};

async function getConfirmationsForMatches(
  matchIds: string[]
): Promise<Map<string, ConfirmationRow[]>> {
  if (matchIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_confirmations")
    .select("match_id, team_id, score_team1, score_team2, screenshot_url, team:teams(name)")
    .in("match_id", matchIds);
  const rows = (data ?? []) as (ConfirmationRow & { match_id: string; team?: { name: string } | { name: string }[] })[];
  const map = new Map<string, ConfirmationRow[]>();
  for (const r of rows) {
    const team = Array.isArray(r.team) ? r.team[0] : r.team;
    const list = map.get(r.match_id) ?? [];
    list.push({ ...r, team: team ?? null });
    map.set(r.match_id, list);
  }
  return map;
}

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
  const confirmationsMap = await getConfirmationsForMatches(matches.map((m) => m.id));

  return (
    <div className="min-h-screen p-6">
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
            {matches.map((m) => {
              const confirmations = confirmationsMap.get(m.id) ?? [];
              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0">
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
                      {confirmations.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                            Подтверждения:
                          </span>
                          {confirmations.map((c) => (
                            <div key={c.team_id} className="flex flex-wrap items-center gap-2 text-xs">
                              <span>
                                {c.team?.name ?? "—"}: {c.score_team1} : {c.score_team2}
                              </span>
                              {c.screenshot_url && (
                                <a
                                  href={c.screenshot_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-500 hover:underline"
                                >
                                  Скриншот
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <Link
                        href={`/matches/${m.id}`}
                        className="inline-block text-xs text-blue-500 hover:underline"
                      >
                        Подробнее
                      </Link>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Запланирован: {formatDate(m.scheduled_at ?? null)}
                      </div>
                      <DisputedMatchActions
                        matchId={m.id}
                        team1Id={m.team1?.id ?? ""}
                        team2Id={m.team2?.id ?? ""}
                        team1Name={m.team1?.name ?? "Команда 1"}
                        team2Name={m.team2?.name ?? "Команда 2"}
                        confirmations={confirmations}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

