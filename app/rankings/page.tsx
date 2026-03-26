import Link from "next/link";
import { Suspense } from "react";
import { getCurrentProfile, getTeamsRanking, getPlayersRanking, getTeamsWhereUserIsCaptain } from "@/app/actions/data";
import FreePlayerRequestButton from "./FreePlayerRequestButton";
import CaptainInviteButton from "./CaptainInviteButton";
import RankingsTabs from "./RankingsTabs";

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{ tab?: string; page?: string }>;
};

export default async function RankingsPage({ searchParams }: Props) {
  const { tab = "teams", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const [teamsRaw, playersRaw, profile, captainTeams] = await Promise.all([
    getTeamsRanking(500),
    getPlayersRanking(500),
    getCurrentProfile(),
    getTeamsWhereUserIsCaptain(),
  ]);

  const teams = teamsRaw.slice(offset, offset + PAGE_SIZE);
  const players = playersRaw.slice(offset, offset + PAGE_SIZE);

  const teamsTotal = teamsRaw.length;
  const playersTotal = playersRaw.length;
  const total = tab === "players" ? playersTotal : teamsTotal;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasPrev = pageNum > 1;
  const hasNext = pageNum < totalPages;

  const isCaptain = !!profile && captainTeams.length > 0;

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-semibold">Рейтинги</h1>

        <Suspense fallback={<div className="mt-4 h-10 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />}>
          <RankingsTabs currentTab={tab} />
        </Suspense>

        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          {tab === "teams" ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left dark:border-neutral-700 dark:bg-neutral-800/50">
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">#</th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Команда</th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Очки</th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Победы</th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Матчей</th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">
                    Последние 5 игр
                  </th>
                </tr>
              </thead>
              <tbody>
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
                      Пока нет данных о командах
                    </td>
                  </tr>
                ) : (
                  teams.map((t, i) => (
                    <tr
                      key={t.id}
                      className="border-b border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                    >
                      <td className="px-4 py-3 font-medium">
                        {(pageNum - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/teams/${t.id}`}
                          className="flex items-center gap-2 font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {t.logo_url ? (
                            <img src={t.logo_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-xs dark:bg-neutral-700">
                              {t.name.charAt(0)}
                            </span>
                          )}
                          {t.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{t.points}</td>
                      <td className="px-4 py-3">{t.wins}</td>
                      <td className="px-4 py-3">{t.matches}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {t.last_results.length === 0 ? (
                            <span className="text-xs text-neutral-400">—</span>
                          ) : (
                            t.last_results.map((r, idx) => (
                              <span
                                key={idx}
                                title={r === "win" ? "Победа" : "Поражение"}
                                className={
                                  r === "win"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-red-600 dark:text-red-400"
                                }
                              >
                                {r === "win" ? "✅" : "❌"}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left dark:border-neutral-700 dark:bg-neutral-800/50">
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">
                    #
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">
                    Игрок
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">
                    Очки
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">
                    Победы
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">
                    Команда
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400"
                    >
                      Пока нет данных об игроках
                    </td>
                  </tr>
                ) : (
                  players.map((p, i) => (
                    <tr
                      key={p.id}
                      className="border-b border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                    >
                      <td className="px-4 py-3 font-medium">
                        {(pageNum - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.avatar_url ? (
                            <img
                              src={p.avatar_url}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300">
                              {(p.warface_nick ?? "Игрок")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                          <Link
                            href={`/players/${p.id}`}
                            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {p.warface_nick ?? "—"}
                          </Link>
                          {p.is_free_agent && (
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                              Свободный агент
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{p.points}</td>
                      <td className="px-4 py-3">{p.wins}</td>
                      <td className="px-4 py-3">
                        {p.team_name ? (
                          <Link
                            href={`/teams/${captainTeams.find(
                              (t) => t.name === p.team_name
                            )?.id ?? ""}`}
                            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {p.team_name}
                          </Link>
                        ) : (
                          <span className="text-sm text-neutral-500 dark:text-neutral-400">
                            Свободный агент
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Link
                            href={`/players/${p.id}`}
                            className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                          >
                            Профиль
                          </Link>
                          {p.is_free_agent && (
                            <>
                              <FreePlayerRequestButton
                                isCurrentUser={profile?.id === p.id}
                              />
                              {isCaptain && (
                                <CaptainInviteButton
                                  teamId={captainTeams[0]?.id ?? null}
                                  playerNick={p.warface_nick}
                                />
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">
              Страница {pageNum} из {totalPages} · всего {total} записей
            </span>
            <div className="flex gap-2">
              {hasPrev && (
                <Link
                  href={`/rankings?tab=${tab}&page=${pageNum - 1}`}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                >
                  ← Назад
                </Link>
              )}
              {hasNext && (
                <Link
                  href={`/rankings?tab=${tab}&page=${pageNum + 1}`}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                >
                  Вперёд →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
