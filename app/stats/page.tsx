import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/app/actions/data";
import { createClient } from "@/lib/supabase/server";
import type { Match, Team } from "@/lib/types";

type MatchWithTeams = Match & {
  team1?: { id: string; name: string } | null;
  team2?: { id: string; name: string } | null;
};

export default async function StatsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", profile.id)
    .limit(1)
    .maybeSingle();

  let team: Team | null = null;
  let matches: MatchWithTeams[] = [];

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
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(100),
    ]);
    team = (teamData ?? null) as Team | null;
    matches = (matchesRaw ?? []) as MatchWithTeams[];
  }

  let wins = 0;
  let losses = 0;
  let totalScoreFor = 0;
  let totalScoreAgainst = 0;
  let currentWinStreak = 0;
  let maxWinStreak = 0;
  let tempStreak = 0;

  for (const m of matches) {
    const isTeam1 = m.team1_id === team?.id;
    const scoreFor = isTeam1 ? m.score_team1 : m.score_team2;
    const scoreAgainst = isTeam1 ? m.score_team2 : m.score_team1;
    totalScoreFor += scoreFor;
    totalScoreAgainst += scoreAgainst;
    if (scoreFor > scoreAgainst) {
      wins++;
      tempStreak++;
      maxWinStreak = Math.max(maxWinStreak, tempStreak);
    } else if (scoreFor < scoreAgainst) {
      losses++;
      tempStreak = 0;
    }
  }
  currentWinStreak = tempStreak;
  const totalMatches = wins + losses;
  const winrate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const avgScoreFor = totalMatches > 0 ? (totalScoreFor / totalMatches).toFixed(1) : "0";
  const avgScoreAgainst = totalMatches > 0 ? (totalScoreAgainst / totalMatches).toFixed(1) : "0";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
        Статистика
      </h1>

      {!team ? (
        <div className="card-surface p-6">
          <p className="text-[#9CA3AF]">
            Вступите в команду, чтобы видеть статистику матчей.
          </p>
          <Link
            href="/teams"
            className="mt-4 inline-block text-[#F97316] hover:underline"
          >
            Перейти к командам
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card-surface p-4">
              <div className="text-sm text-[#9CA3AF]">Матчей</div>
              <div className="text-2xl font-bold text-white">{totalMatches}</div>
            </div>
            <div className="card-surface p-4">
              <div className="text-sm text-[#9CA3AF]">Побед</div>
              <div className="text-2xl font-bold text-emerald-400">{wins}</div>
            </div>
            <div className="card-surface p-4">
              <div className="text-sm text-[#9CA3AF]">Поражений</div>
              <div className="text-2xl font-bold text-red-400">{losses}</div>
            </div>
            <div className="card-surface p-4">
              <div className="text-sm text-[#9CA3AF]">Winrate</div>
              <div className="text-2xl font-bold text-white">{winrate}%</div>
            </div>
            <div className="card-surface p-4">
              <div className="text-sm text-[#9CA3AF]">Средний счёт (за / против)</div>
              <div className="text-2xl font-bold text-white">
                {avgScoreFor} / {avgScoreAgainst}
              </div>
            </div>
            <div className="card-surface p-4">
              <div className="text-sm text-[#9CA3AF]">Серия побед</div>
              <div className="text-2xl font-bold text-[#F97316]">{currentWinStreak}</div>
            </div>
          </div>

          <div className="card-surface p-6">
            <h2 className="mb-4 text-sm font-medium tracking-[0.18em] text-[#E5E7EB]">
              История матчей
            </h2>
            {matches.length === 0 ? (
              <p className="text-[#9CA3AF]">Матчей пока нет</p>
            ) : (
              <ul className="space-y-2">
                {matches.map((m) => {
                  const isTeam1 = m.team1_id === team?.id;
                  const scoreFor = isTeam1 ? m.score_team1 : m.score_team2;
                  const scoreAgainst = isTeam1 ? m.score_team2 : m.score_team1;
                  const won = scoreFor > scoreAgainst;
                  const opponent = isTeam1 ? m.team2?.name : m.team1?.name;
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-[#2A2F3A] bg-[#11141A] px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            won ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        <span className="text-white">{team?.name}</span>
                        <span className="text-[#9CA3AF]">vs</span>
                        <span className="text-white">{opponent ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-white">
                          {scoreFor} : {scoreAgainst}
                        </span>
                        <Link
                          href={`/matches/${m.id}`}
                          className="text-xs text-[#F97316] hover:underline"
                        >
                          Подробнее
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
