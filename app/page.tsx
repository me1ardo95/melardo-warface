import Link from "next/link";
import {
  getTopPlayers,
  getTournamentsWithDetails,
  getTeamsRanking,
} from "@/app/actions/data";

const STATUS_LABELS: Record<string, string> = {
  upcoming: "Регистрация",
  ongoing: "Идёт",
  completed: "Завершён",
  cancelled: "Отменён",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export default async function Home() {
  const [tournaments, topTeams, topPlayers] = await Promise.all([
    getTournamentsWithDetails(),
    getTeamsRanking(5),
    getTopPlayers(5),
  ]);

  const activeTournaments = tournaments.filter((t) =>
    ["upcoming", "ongoing"].includes(t.status)
  );

  return (
    <div className="min-h-screen space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-[#2A2F3A] bg-gradient-to-br from-[#11141A] via-[#0D1014] to-[#07090C] p-8 shadow-2xl sm:p-12 md:p-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.15),transparent)]" />
        <div className="relative space-y-3">
          <h1 className="text-3xl font-bold tracking-[0.2em] text-white sm:text-4xl md:text-5xl [font-family:var(--font-display-primary)]">
            MELARDO WARFACE
          </h1>
          <p className="text-base text-[#F97316] tracking-[0.12em] sm:text-lg [font-family:var(--font-display-alt)]">
            Киберспортивная платформа Warface
          </p>
          <p className="max-w-xl text-sm leading-relaxed text-[#B0B8C5] sm:text-base">
            Создавай команды, участвуй в турнирах и поднимайся в рейтинге.
          </p>
          <div className="pt-1 flex flex-wrap gap-4">
            <Link
              href="/teams/create"
              className="inline-flex items-center justify-center rounded-lg bg-[#F97316] px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-[#F97316]/25 transition-all hover:scale-105 hover:bg-[#FDBA74] hover:shadow-xl hover:shadow-[#F97316]/30"
            >
              Создать команду
            </Link>
            <Link
              href="/tournaments"
              className="inline-flex items-center justify-center rounded-lg border border-[#2A2F3A] bg-transparent px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-105 hover:border-[#F97316] hover:bg-[#F97316]/10 hover:text-[#F97316]"
            >
              Смотреть турниры
            </Link>
          </div>
        </div>
      </section>

      {/* Active Tournaments */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
          Активные турниры
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeTournaments.length === 0 ? (
            <div className="card-surface col-span-full rounded-xl p-6">
              <p className="text-sm text-[#9CA3AF]">
                Пока нет активных турниров. Скоро появятся.
              </p>
              <Link
                href="/tournaments"
                className="mt-3 inline-block text-sm font-medium text-[#F97316] transition-colors hover:text-[#FDBA74]"
              >
                Все турниры →
              </Link>
            </div>
          ) : (
            activeTournaments.slice(0, 6).map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="card-surface group block rounded-xl p-5 transition-all hover:border-[#F97316]/50 hover:shadow-lg hover:shadow-[#F97316]/10"
              >
                <h3 className="font-semibold text-white group-hover:text-[#F97316]">
                  {t.name}
                </h3>
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  {formatDate(t.start_date)} · {t.registered_teams}
                  {typeof (t as { max_teams?: number }).max_teams === "number"
                    ? ` / ${(t as { max_teams: number }).max_teams}`
                    : ""}{" "}
                  команд
                </p>
                <span className="mt-2 inline-block rounded-full bg-[#1F2937] px-2 py-0.5 text-[11px] font-medium text-[#F97316]">
                  {STATUS_LABELS[t.status] ?? t.status}
                </span>
              </Link>
            ))
          )}
        </div>
        {activeTournaments.length > 0 && (
          <Link
            href="/tournaments"
            className="mt-4 inline-block text-sm font-medium text-[#F97316] transition-colors hover:text-[#FDBA74]"
          >
            Все турниры →
          </Link>
        )}
      </section>

      {/* Top Teams */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
          Лучшие команды
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topTeams.length === 0 ? (
            <div className="card-surface col-span-full rounded-xl p-6">
              <p className="text-sm text-[#9CA3AF]">
                Пока нет команд в рейтинге.
              </p>
              <Link
                href="/rankings"
                className="mt-3 inline-block text-sm font-medium text-[#F97316] transition-colors hover:text-[#FDBA74]"
              >
                Рейтинги →
              </Link>
            </div>
          ) : (
            topTeams.map((team, i) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="card-surface group flex items-center gap-3 rounded-xl p-4 transition-all hover:border-[#F97316]/50 hover:shadow-lg hover:shadow-[#F97316]/10"
              >
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[#2A2F3A] group-hover:ring-[#F97316]/50"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1F2937] text-lg font-bold text-[#F97316] group-hover:bg-[#2A2F3A]">
                    {i + 1}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white group-hover:text-[#F97316]">
                    {team.name}
                  </h3>
                  <p className="text-xs text-[#9CA3AF]">
                    {team.points} очков · {team.wins} побед
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#1F2937] px-2.5 py-0.5 text-xs font-bold text-[#F97316]">
                  #{i + 1}
                </span>
              </Link>
            ))
          )}
        </div>
        {topTeams.length > 0 && (
          <Link
            href="/rankings"
            className="mt-4 inline-block text-sm font-medium text-[#F97316] transition-colors hover:text-[#FDBA74]"
          >
            Рейтинги →
          </Link>
        )}
      </section>

      {/* Top Players */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
          Лучшие игроки
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topPlayers.length === 0 ? (
            <div className="card-surface col-span-full rounded-xl p-6">
              <p className="text-sm text-[#9CA3AF]">
                Скоро здесь появится рейтинг игроков.
              </p>
              <Link
                href="/rankings"
                className="mt-3 inline-block text-sm font-medium text-[#F97316] transition-colors hover:text-[#FDBA74]"
              >
                Все игроки →
              </Link>
            </div>
          ) : (
            topPlayers.map((player, i) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="card-surface group flex items-center gap-3 rounded-xl p-4 transition-all hover:border-[#F97316]/50 hover:shadow-lg hover:shadow-[#F97316]/10"
              >
                {player.avatar_url ? (
                  <img
                    src={player.avatar_url}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[#2A2F3A] group-hover:ring-[#F97316]/50"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1F2937] text-lg font-semibold text-[#F97316] group-hover:bg-[#2A2F3A]">
                    {(player.warface_nick || player.display_name || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white group-hover:text-[#F97316]">
                    {player.warface_nick || player.display_name || "Игрок"}
                  </p>
                  <p className="text-xs text-[#9CA3AF]">
                    {(player.points ?? 0)} очков
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                  #{i + 1}
                </span>
              </Link>
            ))
          )}
        </div>
        {topPlayers.length > 0 && (
          <Link
            href="/rankings"
            className="mt-4 inline-block text-sm font-medium text-[#F97316] transition-colors hover:text-[#FDBA74]"
          >
            Все игроки →
          </Link>
        )}
      </section>
    </div>
  );
}
