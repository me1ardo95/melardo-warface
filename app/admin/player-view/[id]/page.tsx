import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/app/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/app/actions/data";
import type { PlayerProfile, Team, Match } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

type PlayerStats = {
  wins: number;
  losses: number;
  matches: number;
  currentStreak: number;
};

async function getPlayerProfile(id: string): Promise<{
  profile: PlayerProfile | null;
  team: Team | null;
  matches: Match[];
  stats: PlayerStats;
}> {
  const supabase = await createClient();
  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (!profileRaw) {
    return {
      profile: null,
      team: null,
      matches: [],
      stats: { wins: 0, losses: 0, matches: 0, currentStreak: 0 },
    };
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", id)
    .limit(1)
    .maybeSingle();

  let team: Team | null = null;
  if (membership?.team_id) {
    const { data: teamData } = await supabase
      .from("teams")
      .select("*")
      .eq("id", membership.team_id)
      .single();
    team = (teamData ?? null) as Team | null;
  }

  let matches: Match[] = [];

  if (team) {
    const { data: matchesRaw } = await supabase
      .from("matches")
      .select("*")
      .or(`team1_id.eq.${team.id},team2_id.eq.${team.id}`)
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(20);
    matches = (matchesRaw ?? []) as Match[];
  }

  let wins = 0;
  let losses = 0;
  let currentStreak = 0;

  for (const m of matches) {
    if (m.status !== "completed") continue;
    const isTeam1 = m.team1_id === team?.id;
    const scoreFor = isTeam1 ? m.score_team1 : m.score_team2;
    const scoreAgainst = isTeam1 ? m.score_team2 : m.score_team1;
    if (scoreFor > scoreAgainst) {
      wins += 1;
    } else if (scoreFor < scoreAgainst) {
      losses += 1;
    }
  }

  for (const m of matches) {
    if (m.status !== "completed") break;
    const isTeam1 = m.team1_id === team?.id;
    const scoreFor = isTeam1 ? m.score_team1 : m.score_team2;
    const scoreAgainst = isTeam1 ? m.score_team2 : m.score_team1;
    if (scoreFor > scoreAgainst) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  const stats: PlayerStats = {
    wins,
    losses,
    matches: matches.length,
    currentStreak,
  };

  const profile: PlayerProfile = {
    ...(profileRaw as PlayerProfile),
    current_team: team,
  };

  return { profile, team, matches, stats };
}

export default async function AdminPlayerViewPage({ params }: Props) {
  const adminProfile = await getCurrentProfile();
  if (!adminProfile) redirect("/login");
  if (adminProfile.role !== "admin") redirect("/");

  const { id } = await params;
  const { profile, team, matches, stats } = await getPlayerProfile(id);

  if (!profile) notFound();

  const displayName =
    profile.warface_nick || profile.display_name || profile.email || "Игрок";
  const initial = displayName.charAt(0).toUpperCase();
  const lastFive = matches.slice(0, 5);

  return (
    <div className="space-y-6">
      <BackButton className="inline-flex text-sm text-[#F97316] hover:text-[#FDBA74]">
        ← Вернуться в админку
      </BackButton>

      <div className="rounded-lg border border-red-900/60 bg-red-900/20 px-4 py-3 text-sm text-red-50">
        <div className="text-xs font-semibold uppercase tracking-wide">
          ⚠️ Режим просмотра администратора
        </div>
        <p className="mt-1 text-xs text-red-100">
          Вы смотрите профиль игрока{" "}
          <span className="font-semibold">{displayName}</span>. Никакие изменения
          не сохраняются.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/admin/donations?user=${encodeURIComponent(profile.id)}`}
            className="inline-flex items-center rounded-md bg-neutral-900/80 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/40 hover:bg-neutral-900"
          >
            Посмотреть донаты игрока
          </Link>
          <Link
            href={`/admin/referrals?user=${encodeURIComponent(profile.id)}`}
            className="inline-flex items-center rounded-md bg-neutral-900/80 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/40 hover:bg-neutral-900"
          >
            Посмотреть рефералы игрока
          </Link>
          <Link
            href={`/admin/matches?user=${encodeURIComponent(profile.id)}`}
            className="inline-flex items-center rounded-md bg-neutral-900/80 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/40 hover:bg-neutral-900"
          >
            История матчей игрока
          </Link>
        </div>
      </div>

      <div className="card-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start gap-6">
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-24 w-24 shrink-0 rounded-full border-4 border-[#E63946] object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-[#E63946] bg-[#11141A] text-4xl font-semibold text-[#F97316] shadow-lg">
                {initial}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl tracking-[0.14em] text-white [font-family:var(--font-display-alt)]">
                {displayName}
              </h1>
              <span className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] ring-1 ring-[#4B5563]">
                Профиль игрока (просмотр)
              </span>
            </div>
            <p className="text-sm text-[#B0B8C5]">
              Профиль игрока MELARDO WARFACE
            </p>
            {team ? (
              <p className="mt-1 text-sm text-[#E5E7EB]">
                Текущая команда:{" "}
                <Link
                  href={`/admin/team-view/${team.id}`}
                  className="font-semibold text-[#F97316] hover:text-[#FDBA74]"
                >
                  {team.name}
                </Link>
              </p>
            ) : (
              <p className="mt-1 text-sm text-[#9CA3AF]">
                Игрок не состоит в команде.
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs uppercase tracking-wide text-[#9CA3AF]">
              <span>
                Ник в Warface:{" "}
                <span className="font-semibold text-white">
                  {profile.warface_nick ?? "не указан"}
                </span>
              </span>
              <span>
                Очки:{" "}
                <span className="font-semibold text-[#F97316] [font-family:var(--font-jetbrains)]">
                  {profile.points ?? 0}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-[#2A2F3A] bg-[#11141A] p-4 md:col-span-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#B0B8C5]">
              Победы
            </div>
            <div className="mt-2 text-3xl font-semibold text-[#10B981] [font-family:var(--font-jetbrains)]">
              {stats.wins}
            </div>
          </div>
          <div className="rounded-xl border border-[#2A2F3A] bg-[#11141A] p-4 md:col-span-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#B0B8C5]">
              Поражения
            </div>
            <div className="mt-2 text-3xl font-semibold text-[#EF4444] [font-family:var(--font-jetbrains)]">
              {stats.losses}
            </div>
          </div>
          <div className="rounded-xl border border-[#2A2F3A] bg-[#11141A] p-4 md:col-span-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#B0B8C5]">
              Матчи
            </div>
            <div className="mt-2 text-3xl font-semibold text-white [font-family:var(--font-jetbrains)]">
              {stats.matches}
            </div>
          </div>
          <div className="rounded-xl border border-[#2A2F3A] bg-[#11141A] p-4 md:col-span-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#B0B8C5]">
              Серия побед
            </div>
            <div className="mt-2 flex items-baseline gap-2 text-3xl font-semibold text-[#F97316] [font-family:var(--font-jetbrains)]">
              <span>🔥</span>
              <span>{stats.currentStreak}</span>
              <span className="text-xs text-[#9CA3AF]">подряд</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card-surface p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
            Последние бои
          </h2>
          <span className="text-xs uppercase tracking-wide text-[#6B7280]">
            только официальные матчи
          </span>
        </div>

        {lastFive.length === 0 ? (
          <p className="mt-3 text-sm text-[#9CA3AF]">
            Бои пока не зафиксированы. Примите вызов или зарегистрируйтесь на
            турнир, чтобы начать историю побед.
          </p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {lastFive.map((m) => {
              const isTeam1 = m.team1_id === team?.id;
              const scoreFor = isTeam1 ? m.score_team1 : m.score_team2;
              const scoreAgainst = isTeam1 ? m.score_team2 : m.score_team1;
              const isWin =
                m.status === "completed" && scoreFor > scoreAgainst;

              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-[#2A2F3A] bg-[#11141A] px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        isWin ? "text-[#10B981]" : "text-[#EF4444]"
                      }
                    >
                      {isWin ? "✅" : "❌"}
                    </span>
                    <span className="font-mono text-sm text-[#E5E7EB]">
                      {m.score_team1} : {m.score_team2}
                    </span>
                  </div>
                  <span className="text-xs text-[#9CA3AF]">
                    {m.completed_at
                      ? new Date(m.completed_at).toLocaleString("ru-RU")
                      : "Запланирован"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

