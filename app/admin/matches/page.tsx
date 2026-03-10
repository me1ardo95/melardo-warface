import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getMatchesWithDetails } from "@/app/actions/data";
import type { Match, Team, Tournament } from "@/lib/types";
import { AdminNav } from "../AdminNav";

type MatchWithDetails = Match & {
  team1?: Team;
  team2?: Team;
  tournament?: Tournament;
};

type ConfirmationRow = {
  id: string;
  match_id: string;
  team_id: string;
  score_team1: number;
  score_team2: number;
  screenshot_url: string;
  status: string;
  team?: { name: string } | null;
};

async function getConfirmationsByMatch(): Promise<
  Map<string, ConfirmationRow[]>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_confirmations")
    .select(
      "id, match_id, team_id, score_team1, score_team2, screenshot_url, status, team:teams(name)"
    )
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as (ConfirmationRow & { team?: { name: string } | { name: string }[] })[];
  const map = new Map<string, ConfirmationRow[]>();
  for (const r of rows) {
    const team = Array.isArray(r.team) ? r.team[0] : r.team;
    const row: ConfirmationRow = {
      ...r,
      team: team ?? null,
    };
    const list = map.get(r.match_id) ?? [];
    list.push(row);
    map.set(r.match_id, list);
  }
  return map;
}

async function getComplaintCountByMatch(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("complaints")
    .select("match_id")
    .not("match_id", "is", null);
  const map = new Map<string, number>();
  for (const r of data ?? []) {
    const mid = r.match_id as string;
    map.set(mid, (map.get(mid) ?? 0) + 1);
  }
  return map;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU");
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Запланирован",
  live: "Идёт",
  completed: "Завершён",
  cancelled: "Отменён",
  postponed: "Перенесён",
  disputed: "Спорный",
};

export default async function AdminMatchesPage() {
  const [profile, matchesRaw, confirmationsMap, complaintCountMap] =
    await Promise.all([
      getCurrentProfile(),
      getMatchesWithDetails(),
      getConfirmationsByMatch(),
      getComplaintCountByMatch(),
    ]);

  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const matches = matchesRaw as MatchWithDetails[];

  return (
    <div className="min-h-screen p-6">
      <AdminNav active="matches" />

      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Матчи
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Все матчи платформы: подтверждения, скриншоты, жалобы.
          </p>
        </div>

        {matches.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            Матчей пока нет.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {matches.map((m) => {
              const confirmations = confirmationsMap.get(m.id) ?? [];
              const complaintCount = complaintCountMap.get(m.id) ?? 0;
              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {m.team1?.name ?? "—"} vs {m.team2?.name ?? "—"}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Турнир:{" "}
                        {m.tournament ? (
                          <Link
                            href={`/admin/tournaments/${m.tournament.id}/teams`}
                            className="text-blue-500 hover:underline"
                          >
                            {m.tournament.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Статус:{" "}
                        <span
                          className={
                            m.status === "disputed"
                              ? "text-amber-600 dark:text-amber-400"
                              : m.status === "completed"
                                ? "text-green-600 dark:text-green-400"
                                : ""
                          }
                        >
                          {STATUS_LABELS[m.status] ?? m.status}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Счёт: {m.score_team1} : {m.score_team2} | Запланирован:{" "}
                        {formatDate(m.scheduled_at ?? null)}
                      </div>

                      {confirmations.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                            Подтверждения:
                          </span>
                          {confirmations.map((c) => (
                            <div
                              key={c.id}
                              className="flex flex-wrap items-center gap-2 text-xs"
                            >
                              <span>
                                {c.team?.name ?? "Команда"}: {c.score_team1} :
                                {c.score_team2} ({c.status})
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

                      {complaintCount > 0 && (
                        <div className="mt-1">
                          <Link
                            href={`/admin/complaints`}
                            className="text-xs text-amber-600 hover:underline dark:text-amber-400"
                          >
                            Жалоб: {complaintCount}
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Link
                        href={`/matches/${m.id}`}
                        className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                      >
                        Подробнее
                      </Link>
                      {m.status === "disputed" && (
                        <Link
                          href="/admin/disputed-matches"
                          className="text-xs text-amber-600 hover:underline dark:text-amber-400"
                        >
                          Разрешить спор
                        </Link>
                      )}
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
