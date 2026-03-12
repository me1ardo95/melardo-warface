import Link from "next/link";
import { getSeasonLeaderboard, getWeeklyLeaderboard } from "@/app/actions/missions";
import { getActiveSeason } from "@/lib/missions";

export default async function SeasonLeaderboardPage() {
  const [seasonTop, weeklyTop, activeSeason] = await Promise.all([
    getSeasonLeaderboard(100),
    getWeeklyLeaderboard(100),
    getActiveSeason(),
  ]);

  const renderSeasonTable = () => (
    <div className="overflow-hidden rounded-xl border border-[#2A2F3A] bg-[#11141A]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2A2F3A] bg-[#0f141b] text-left">
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">#</th>
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">Игрок</th>
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">Уровень</th>
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">XP</th>
          </tr>
        </thead>
        <tbody>
          {seasonTop.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-[#9CA3AF]">
                Пока нет данных
              </td>
            </tr>
          ) : (
            seasonTop.map((r) => (
              <tr
                key={r.user_id}
                className="border-b border-[#1F2937] transition-colors hover:bg-[#1a1e24]"
              >
                <td className="px-4 py-3 font-medium text-[#E5E7EB]">
                  {r.rank}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/players/${r.user_id}`}
                    className="font-medium text-[#F97316] hover:underline"
                  >
                    {r.warface_nick}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-white">{r.level}</td>
                <td className="px-4 py-3 font-mono text-[#9CA3AF]">{r.xp}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderWeeklyTable = () => (
    <div className="overflow-hidden rounded-xl border border-[#2A2F3A] bg-[#11141A]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2A2F3A] bg-[#0f141b] text-left">
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">#</th>
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">Игрок</th>
            <th className="px-4 py-3 font-medium text-[#9CA3AF]">+Очки за неделю</th>
          </tr>
        </thead>
        <tbody>
          {weeklyTop.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-[#9CA3AF]">
                Пока нет данных
              </td>
            </tr>
          ) : (
            weeklyTop.map((r) => (
              <tr
                key={r.user_id}
                className="border-b border-[#1F2937] transition-colors hover:bg-[#1a1e24]"
              >
                <td className="px-4 py-3 font-medium text-[#E5E7EB]">
                  {r.rank}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/players/${r.user_id}`}
                    className="font-medium text-[#F97316] hover:underline"
                  >
                    {r.warface_nick}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-[#10b981]">+{r.points}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
          Сезонный рейтинг
        </h1>
        <Link
          href="/season"
          className="btn-outline inline-flex items-center justify-center text-sm"
        >
          Мой сезон
        </Link>
      </div>

      {activeSeason ? (
        <p className="text-[#9CA3AF]">
          Рейтинг сезона «{activeSeason.name}»
        </p>
      ) : null}

      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9CA3AF]">
            ТОП 100 сезона
          </h2>
          {renderSeasonTable()}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9CA3AF]">
            ТОП недели
          </h2>
          <p className="mb-2 text-xs text-[#9CA3AF]">
            Игроки, набравшие больше всего рейтинга за последние 7 дней
          </p>
          {renderWeeklyTable()}
        </section>
      </div>
    </div>
  );
}
