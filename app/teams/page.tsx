import Link from "next/link";
import { Suspense } from "react";
import { getTeamsWithStats } from "@/app/actions/data";
import TeamsViewToggle from "./TeamsViewToggle";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  searchParams: Promise<{ view?: string }>;
};

export default async function TeamsPage({ searchParams }: Props) {
  const { view = "tiles" } = await searchParams;
  const teamsRaw = await getTeamsWithStats();
  const teamsForTable = [...teamsRaw].sort((a, b) => b.points - a.points);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <nav className="mb-6 flex flex-wrap items-center gap-3 border-b border-neutral-200 pb-4 text-sm dark:border-neutral-800">
        <Link href="/" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          Главная
        </Link>
        <Link href="/profile" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          Профиль
        </Link>
        <Link href="/teams" className="font-medium text-neutral-900 dark:text-neutral-100">
          Команды
        </Link>
        <Link href="/matches" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          Вызовы
        </Link>
        <Link href="/tournaments" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          Турниры
        </Link>
        <Link href="/rankings" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          Рейтинги
        </Link>
      </nav>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Команды</h1>
          <div className="flex items-center gap-4">
            <Suspense fallback={<div className="h-9 w-36 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />}>
              <TeamsViewToggle />
            </Suspense>
            <Link
              href="/teams/create"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
            >
              Создать команду
            </Link>
          </div>
        </div>

        {teamsRaw.length === 0 ? (
          <p className="mt-4 text-neutral-500 dark:text-neutral-400">
            Команд пока нет. Создайте первую команду или дождитесь данных из
            миграций.
          </p>
        ) : view === "table" ? (
          /* Таблица лиги */
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[720px] text-sm rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left dark:border-neutral-700 dark:bg-neutral-800/50">
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Место</th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Логотип</th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Команда</th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Капитан</th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Состав</th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Игры</th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Победы</th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Поражения</th>
                  <th className="px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Очки</th>
                </tr>
              </thead>
              <tbody>
                {teamsForTable.map((team, i) => {
                  const place = i + 1;
                  const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : null;
                  const games = team.wins + team.losses;
                  return (
                    <tr
                      key={team.id}
                      className={`border-b border-neutral-100 transition-colors last:border-0 ${
                        i % 2 === 1 ? "bg-neutral-50/50 dark:bg-neutral-800/30" : ""
                      } hover:bg-neutral-100/80 dark:hover:bg-neutral-800/50`}
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex min-w-[2rem] items-center gap-1">
                          {medal ?? place}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/teams/${team.id}`} className="block">
                          {team.logo_url ? (
                            <img
                              src={team.logo_url}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                              {team.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/teams/${team.id}`}
                          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {team.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                        {team.captain_nick ?? "—"}
                      </td>
                      <td className="px-4 py-3">{team.member_count}/7</td>
                      <td className="px-4 py-3">{games}</td>
                      <td className="px-4 py-3">{team.wins}</td>
                      <td className="px-4 py-3">{team.losses}</td>
                      <td className="px-4 py-3 font-medium">{team.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Плитки */
          <ul className="mt-4 flex flex-col gap-4">
            {teamsRaw.map((team) => (
              <li key={team.id}>
                <Link
                  href={`/teams/${team.id}`}
                  className="flex gap-5 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-blue-300 hover:bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-blue-700 dark:hover:bg-neutral-800/80"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-neutral-500 dark:text-neutral-400">
                        {team.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      {team.name}
                    </h2>
                    {team.city && (
                      <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                        📍 {team.city}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <span>🏆</span> {team.wins} побед
                      </span>
                      <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <span>⚔️</span> {team.total_matches} матчей
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <span>📊</span> {team.points} очков
                      </span>
                      <span className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
                        <span>👥</span> {team.member_count}/7 игроков
                      </span>
                    </div>
                    {team.last_results.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs">
                        <span className="text-neutral-500 dark:text-neutral-400">🔥 Последние:</span>
                        <span className="flex gap-0.5">
                          {team.last_results.map((r, i) => (
                            <span key={i} title={r === "win" ? "Победа" : "Поражение"} className="text-base">
                              {r === "win" ? "🏆" : "💔"}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    className="hidden shrink-0 text-xs text-neutral-400 dark:text-neutral-500 sm:block"
                    title={`Создана: ${formatDate(team.created_at)}`}
                  >
                    📅 {formatDate(team.created_at)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
