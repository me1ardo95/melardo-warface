import { redirect } from "next/navigation";
import { getCurrentProfile, getTeamsWithStats, type TeamWithStats } from "@/app/actions/data";

export default async function AdminTeamsPage() {
  const [profile, teamsRaw] = await Promise.all([
    getCurrentProfile(),
    getTeamsWithStats(),
  ]);
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const teams = teamsRaw as TeamWithStats[];

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Команды
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Список команд с краткой статистикой и переходом в админ‑просмотр.
          </p>
        </div>

        {teams.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            Команд пока нет.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {teams.map((team) => (
              <li
                key={team.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/admin/team-view/${team.id}`}
                      className="text-sm font-semibold text-neutral-900 hover:underline dark:text-neutral-100"
                    >
                      {team.name}
                    </a>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {team.mode ?? "режим не указан"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Очки:{" "}
                    <span className="font-mono text-[#F97316]">
                      {team.points}
                    </span>{" "}
                    · Победы: {team.wins} · Поражения: {team.losses} · Матчи:{" "}
                    {team.total_matches}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Игроки: {team.member_count}/7 · Капитан:{" "}
                    {team.captain_nick ?? "не указан"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Создана:{" "}
                    {new Date(team.created_at).toLocaleDateString("ru-RU")}
                  </span>
                  {team.last_results.length > 0 && (
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Последние игры:{" "}
                      {team.last_results
                        .map((r) => (r === "win" ? "🏆" : "💔"))
                        .join(" ")}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

