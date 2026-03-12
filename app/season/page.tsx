import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/app/actions/data";
import { getSeasonProgress } from "@/app/actions/missions";

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function SeasonPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const data = await getSeasonProgress(profile.id);

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
          Сезон
        </h1>
        <div className="card-surface rounded-xl p-8 text-center text-[#9CA3AF]">
          Сейчас нет активного сезона. Следите за обновлениями!
        </div>
      </div>
    );
  }

  const { season, xp, level, levels } = data;
  const currentLevel = levels.find((l) => (l.xp_required ?? 0) > xp);
  const prevLevel = levels
    .filter((l) => (l.xp_required ?? 0) <= xp)
    .pop();
  const nextLevel = levels.find((l) => (l.xp_required ?? 0) > xp);
  const xpForCurrent = nextLevel ? nextLevel.xp_required ?? 0 : xp;
  const xpFromPrev = prevLevel ? prevLevel.xp_required ?? 0 : 0;
  const xpNeeded = xpForCurrent - xpFromPrev;
  const xpProgress = xp - xpFromPrev;
  const pct = xpNeeded > 0 ? Math.min(100, (xpProgress / xpNeeded) * 100) : 100;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
          {season.name}
        </h1>
        <Link
          href="/season-leaderboard"
          className="btn-outline inline-flex items-center justify-center text-sm"
        >
          Таблица лидеров
        </Link>
      </div>

      <p className="text-sm text-[#9CA3AF]">
        {formatDate(season.start_date)} — {formatDate(season.end_date)}
      </p>

      <div className="card-surface rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#9CA3AF]">Ваш уровень</p>
            <p className="text-4xl font-bold text-[#F97316] [font-family:var(--font-display-alt)]">
              {level}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#9CA3AF]">XP</p>
            <p className="font-mono text-2xl text-white">{xp}</p>
          </div>
        </div>
        {nextLevel && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-[#9CA3AF]">
              <span>До уровня {nextLevel.level}</span>
              <span>
                {xpProgress} / {xpNeeded} XP
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1F2937]">
              <div
                className="h-full rounded-full bg-[#F97316] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9CA3AF]">
          Уровни Season Pass
        </h2>
        <div className="space-y-2">
          {levels.slice(0, 20).map((l) => {
            const unlocked = xp >= (l.xp_required ?? 0);
            return (
              <div
                key={l.level}
                className={`flex items-center justify-between rounded-lg border px-4 py-2 ${
                  unlocked
                    ? "border-[#10b981]/50 bg-[#0d2818]/30"
                    : "border-[#2A2F3A] bg-[#11141A]"
                }`}
              >
                <span
                  className={`font-medium ${unlocked ? "text-[#10b981]" : "text-[#9CA3AF]"}`}
                >
                  Уровень {l.level}
                </span>
                <span className="font-mono text-sm text-[#9CA3AF]">
                  {l.xp_required} XP
                </span>
              </div>
            );
          })}
        </div>
        {levels.length > 20 && (
          <p className="mt-2 text-center text-sm text-[#9CA3AF]">
            ... и ещё {levels.length - 20} уровней
          </p>
        )}
      </section>
    </div>
  );
}
