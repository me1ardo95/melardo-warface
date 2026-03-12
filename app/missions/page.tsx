import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/app/actions/data";
import { getMissionsWithProgress, type MissionWithProgress } from "@/app/actions/missions";

function MissionCard({ m }: { m: MissionWithProgress }) {
  const pct = Math.min(100, (m.progress / m.objective_value) * 100);
  return (
    <div
      className={`card-surface rounded-xl p-4 ${
        m.completed ? "border-[#10b981] bg-[#0d2818]/40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-white">{m.title}</h3>
          {m.description && (
            <p className="mt-1 text-sm text-[#9CA3AF]">{m.description}</p>
          )}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-[#9CA3AF]">
              <span>
                {m.progress} / {m.objective_value}
              </span>
              {m.completed && (
                <span className="text-[#10b981]">Выполнено</span>
              )}
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#1F2937]">
              <div
                className="h-full rounded-full bg-[#F97316] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
          {m.reward_xp > 0 && (
            <span className="font-mono text-[#F97316]">+{m.reward_xp} XP</span>
          )}
          {m.reward_rating > 0 && (
            <span className="font-mono text-[#10b981]">
              +{m.reward_rating} рейтинг
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MissionSection({
  title,
  missions,
  emptyText,
}: {
  title: string;
  missions: MissionWithProgress[];
  emptyText: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9CA3AF]">
        {title}
      </h2>
      {missions.length === 0 ? (
        <div className="rounded-xl border border-[#2A2F3A] bg-[#11141A] px-4 py-8 text-center text-[#9CA3AF]">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {missions.map((m) => (
            <MissionCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function MissionsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { daily, weekly, seasonal } = await getMissionsWithProgress(profile.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
          Миссии
        </h1>
        <Link
          href="/season"
          className="btn-outline inline-flex items-center justify-center text-sm"
        >
          Сезон
        </Link>
      </div>

      <p className="text-[#9CA3AF]">
        Выполняйте миссии, получайте XP и рейтинг. Прогресс обновляется после
        каждого завершённого матча.
      </p>

      <MissionSection
        title="Ежедневные"
        missions={daily}
        emptyText="Ежедневные миссии появятся сегодня. Проверьте позже."
      />

      <MissionSection
        title="Еженедельные"
        missions={weekly}
        emptyText="Еженедельные миссии появятся в понедельник."
      />

      <MissionSection
        title="Сезонные"
        missions={seasonal}
        emptyText="Сезонные миссии появятся при старте сезона."
      />
    </div>
  );
}
