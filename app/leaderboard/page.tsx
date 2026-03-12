import Link from "next/link";
import { Suspense } from "react";
import {
  getTeamsRanking,
  getPlayersRanking,
  getPlayersRankingByPeriod,
  getTeamsRankingByPeriod,
  type TeamRankingRow,
  type PlayerRankingRow,
} from "@/app/actions/data";
import LeaderboardTabs from "./LeaderboardTabs";

const LIMIT = 100;

async function LeaderboardContent({ tab }: { tab: string }) {
  const isWeek = tab === "week";
  const isMonth = tab === "month";
  const [teams, players, playersWeek, playersMonth, teamsWeek, teamsMonth] =
    await Promise.all([
      getTeamsRanking(LIMIT),
      getPlayersRanking(LIMIT),
      getPlayersRankingByPeriod(LIMIT, 7),
      getPlayersRankingByPeriod(LIMIT, 30),
      getTeamsRankingByPeriod(LIMIT, 7),
      getTeamsRankingByPeriod(LIMIT, 30),
    ]);

  const activePlayers =
    isWeek ? playersWeek : isMonth ? playersMonth : (players as PlayerRankingRow[]);
  const activeTeams =
    isWeek ? teamsWeek : isMonth ? teamsMonth : (teams as TeamRankingRow[]);

  const renderPlayersTable = (list: PlayerRankingRow[], emptyMsg: string) => (
    <div className="overflow-hidden rounded-xl border border-[#2A2F3A] bg-[#11141A]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2A2F3A] bg-[#0f141b] text-left">
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">#</th>
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">Игрок</th>
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">Очки</th>
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">Команда</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-[#9CA3AF]">
                {emptyMsg}
              </td>
            </tr>
          ) : (
            list.map((p, i) => (
              <tr
                key={p.id}
                className="border-b border-[#1F2937] transition-colors hover:bg-[#1a1e24]"
              >
                <td className="px-4 py-3 font-medium text-[#E5E7EB]">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/players/${p.id}`}
                    className="font-medium text-[#F97316] hover:underline"
                  >
                    {p.warface_nick ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-white">{p.points}</td>
                <td className="px-4 py-3 text-[#9CA3AF]">
                  {p.team_name ?? "Свободный агент"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderTeamsTable = (list: TeamRankingRow[], emptyMsg: string) => (
    <div className="overflow-hidden rounded-xl border border-[#2A2F3A] bg-[#11141A]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2A2F3A] bg-[#0f141b] text-left">
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">#</th>
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">Команда</th>
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">Очки</th>
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">Победы</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-[#9CA3AF]">
                {emptyMsg}
              </td>
            </tr>
          ) : (
            list.map((t, i) => (
              <tr
                key={t.id}
                className="border-b border-[#1F2937] transition-colors hover:bg-[#1a1e24]"
              >
                <td className="px-4 py-3 font-medium text-[#E5E7EB]">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/teams/${t.id}`}
                    className="flex items-center gap-2 font-medium text-[#F97316] hover:underline"
                  >
                    {t.logo_url ? (
                      <img
                        src={t.logo_url}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1F2937] text-xs text-[#E5E7EB]">
                        {t.name.charAt(0)}
                      </span>
                    )}
                    {t.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-white">{t.points}</td>
                <td className="px-4 py-3 text-[#9CA3AF]">{t.wins}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  if (tab === "players") {
    return renderPlayersTable(activePlayers, "Пока нет данных об игроках");
  }
  if (tab === "teams") {
    return renderTeamsTable(activeTeams, "Пока нет данных о командах");
  }
  if (tab === "week" || tab === "month") {
    const periodLabel = tab === "week" ? "недели" : "месяца";
    return (
      <div className="space-y-8">
        <div>
          <h3 className="mb-2 text-sm font-medium text-[#9CA3AF]">
            Игроки ({periodLabel})
          </h3>
          {renderPlayersTable(
            activePlayers,
            `Нет данных за ${periodLabel}`
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-[#9CA3AF]">
            Команды ({periodLabel})
          </h3>
          {renderTeamsTable(activeTeams, `Нет данных за ${periodLabel}`)}
        </div>
      </div>
    );
  }

  return renderTeamsTable(activeTeams, "Пока нет данных о командах");
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "teams" } = await searchParams;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
        Таблица лидеров
      </h1>

      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-xl bg-[#11141A]" />
        }
      >
        <LeaderboardTabs currentTab={tab} basePath="/leaderboard" />
        <div className="mt-4">
          <LeaderboardContent tab={tab} />
        </div>
      </Suspense>
    </div>
  );
}
