import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/app/actions/data";
import { ComplaintButton } from "@/app/components/ComplaintButton";
import type { PlayerProfile, Team, Match } from "@/lib/types";

type MatchWithTeams = Match & {
  team1?: { id: string; name: string } | null;
  team2?: { id: string; name: string } | null;
};

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
  const [{ data: profileRaw }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("team_members").select("team_id").eq("user_id", id).limit(1).maybeSingle(),
  ]);

  if (!profileRaw) {
    return {
      profile: null,
      team: null,
      matches: [],
      stats: { wins: 0, losses: 0, matches: 0, currentStreak: 0 },
    };
  }

  let team: Team | null = null;
  let matches: Match[] = [];

  if (membership?.team_id) {
    const [{ data: teamData }, { data: matchesRaw }] = await Promise.all([
      supabase.from("teams").select("*").eq("id", membership.team_id).single(),
      supabase
        .from("matches")
        .select(
          `*,
          team1:teams!matches_team1_id_fkey(id, name),
          team2:teams!matches_team2_id_fkey(id, name)`
        )
        .or(`team1_id.eq.${membership.team_id},team2_id.eq.${membership.team_id}`)
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(20),
    ]);
    team = (teamData ?? null) as Team | null;
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

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const [{ profile, team, matches, stats }, currentProfile] =
    await Promise.all([getPlayerProfile(id), getCurrentProfile()]);

  if (!profile) notFound();

  const displayName =
    profile.warface_nick || profile.display_name || profile.email || "Игрок";
  const initial = displayName.charAt(0).toUpperCase();

  const isCurrentUser = currentProfile?.id === profile.id;

  const roleBadge = team
    ? isCurrentUser
      ? "Боец отряда"
      : "Игрок команды"
    : "Свободный агент";

  const roleColor = team ? "#E63946" : "#6B7280";

  const lastFive = matches.slice(0, 5);

  return (
    <div className="space-y-6">
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
              <span
                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
                style={{
                  border: `1px solid ${roleColor}`,
                  color: roleColor,
                  background:
                    roleColor === "#6B7280"
                      ? "rgba(55,65,81,0.35)"
                      : "rgba(230,57,70,0.12)",
                }}
              >
                {roleBadge}
              </span>
            </div>
            <p className="text-sm text-[#B0B8C5]">
              Профиль игрока MELARDO WARFACE
            </p>
            {team ? (
              <p className="mt-1 text-sm text-[#E5E7EB]">
                Текущая команда:{" "}
                <Link
                  href={`/teams/${team.id}`}
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
              <ComplaintButton
                playerId={profile.id}
                className="rounded border border-[#2A2F3A] bg-[#11141A] px-2 py-1 text-xs font-medium text-[#B0B8C5] hover:bg-[#1F2937] hover:text-white"
              />
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
          {isCurrentUser && (
            <span className="text-xs uppercase tracking-wide text-[#6B7280]">
              только официальные матчи
            </span>
          )}
        </div>

        {lastFive.length === 0 ? (
          <p className="mt-3 text-sm text-[#9CA3AF]">
            Бои пока не зафиксированы. Примите вызов или зарегистрируйтесь на
            турнир, чтобы начать историю побед.
          </p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {(lastFive as MatchWithTeams[]).map((m) => {
              const isTeam1 = m.team1_id === team?.id;
              const scoreFor = isTeam1 ? m.score_team1 : m.score_team2;
              const scoreAgainst = isTeam1 ? m.score_team2 : m.score_team1;
              const isWin = m.status === "completed" && scoreFor > scoreAgainst;
              const opponent =
                isTeam1 ? m.team2?.name : m.team1?.name;
              const teamName = isTeam1 ? m.team1?.name : m.team2?.name;

              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#2A2F3A] bg-[#11141A] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={isWin ? "text-[#10B981]" : "text-[#EF4444]"}>
                        {isWin ? "✅" : "❌"}
                      </span>
                      <span className="text-[#E5E7EB]">
                        {teamName ?? "—"} vs {opponent ?? "—"}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[#9CA3AF]">
                      <span className="font-mono">{m.score_team1} : {m.score_team2}</span>
                      <span>
                        {m.completed_at
                          ? new Date(m.completed_at).toLocaleString("ru-RU")
                          : "Запланирован"}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/matches/${m.id}`}
                    className="shrink-0 rounded border border-[#2A2F3A] px-2 py-1 text-xs font-medium text-[#F97316] hover:bg-[#1F2937]"
                  >
                    Подробнее
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

