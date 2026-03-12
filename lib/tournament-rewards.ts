import type { SupabaseClient } from "@supabase/supabase-js";

type RewardRow = { place: number; rating_reward: number; xp_reward: number };

async function getActiveSeasonId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.id ?? null;
}

async function getRewards(supabase: SupabaseClient, tournamentId: string): Promise<RewardRow[]> {
  const { data } = await supabase
    .from("tournament_rewards")
    .select("place, rating_reward, xp_reward")
    .eq("tournament_id", tournamentId);

  const rows = (data ?? []) as any[];
  const byPlace = new Map<number, RewardRow>();
  rows.forEach((r) => {
    const place = Number(r.place);
    if (!Number.isFinite(place)) return;
    byPlace.set(place, {
      place,
      rating_reward: Number(r.rating_reward ?? 0) || 0,
      xp_reward: Number(r.xp_reward ?? 0) || 0,
    });
  });

  // defaults, если не настроено
  const defaults: RewardRow[] = [
    { place: 1, rating_reward: 150, xp_reward: 600 },
    { place: 2, rating_reward: 80, xp_reward: 300 },
    { place: 3, rating_reward: 40, xp_reward: 150 },
  ];
  defaults.forEach((d) => {
    if (!byPlace.has(d.place)) byPlace.set(d.place, d);
  });

  return [1, 2, 3].map((p) => byPlace.get(p)!).filter(Boolean);
}

export async function awardTournamentTop3Rewards(opts: {
  supabase: SupabaseClient;
  tournamentId: string;
  winnerTeamId: string;
}) {
  const { supabase, tournamentId, winnerTeamId } = opts;

  // Защита от повторной выдачи: если уже есть rewards_log для этого турнира (place1) — выходим
  const { data: already } = await supabase
    .from("team_points_history")
    .select("id")
    .eq("comment", `Награда за 1 место турнира (${tournamentId})`)
    .limit(1)
    .maybeSingle();
  if (already) return { ok: true, awarded: false as const };

  const { data: finalRow } = await supabase
    .from("tournament_brackets")
    .select("team1_id, team2_id, winner_team_id")
    .eq("tournament_id", tournamentId)
    .eq("round", "final")
    .limit(1)
    .maybeSingle();

  const runnerUp =
    finalRow && (finalRow as any).team1_id && (finalRow as any).team2_id
      ? ((finalRow as any).team1_id === winnerTeamId
          ? (finalRow as any).team2_id
          : (finalRow as any).team1_id)
      : null;

  const { data: semis } = await supabase
    .from("tournament_brackets")
    .select("team1_id, team2_id, winner_team_id")
    .eq("tournament_id", tournamentId)
    .eq("round", "semi_final");

  const semiLosers = (semis ?? [])
    .map((r: any) => {
      const t1 = r.team1_id as string | null;
      const t2 = r.team2_id as string | null;
      const w = r.winner_team_id as string | null;
      if (!t1 || !t2 || !w) return null;
      return w === t1 ? t2 : t1;
    })
    .filter((v): v is string => !!v)
    .filter((tid) => tid !== winnerTeamId && tid !== runnerUp);

  let third: string | null = semiLosers[0] ?? null;
  if (semiLosers.length > 1) {
    const { data: seeds } = await supabase
      .from("tournament_teams")
      .select("team_id, seed")
      .eq("tournament_id", tournamentId)
      .in("team_id", semiLosers);
    const seedByTeam = new Map((seeds ?? []).map((s: any) => [s.team_id as string, Number(s.seed ?? 9999)]));
    third = [...semiLosers].sort((a, b) => (seedByTeam.get(a) ?? 9999) - (seedByTeam.get(b) ?? 9999))[0] ?? third;
  }

  const placements: Array<{ place: number; team_id: string | null }> = [
    { place: 1, team_id: winnerTeamId },
    { place: 2, team_id: runnerUp },
    { place: 3, team_id: third },
  ].filter((p) => !!p.team_id) as any;

  const rewards = await getRewards(supabase, tournamentId);
  const rewardByPlace = new Map(rewards.map((r) => [r.place, r]));

  const seasonId = await getActiveSeasonId(supabase);

  for (const p of placements) {
    const reward = rewardByPlace.get(p.place);
    if (!reward) continue;

    const teamId = p.team_id!;

    // rating reward → team points
    if (reward.rating_reward) {
      const { data: teamRow } = await supabase
        .from("teams")
        .select("points")
        .eq("id", teamId)
        .single();
      await supabase
        .from("teams")
        .update({ points: (teamRow?.points ?? 0) + reward.rating_reward })
        .eq("id", teamId);

      await supabase.from("team_points_history").insert({
        team_id: teamId,
        delta: reward.rating_reward,
        comment: `Награда за ${p.place} место турнира (${tournamentId})`,
      });
    }

    // xp reward → всем участникам команды (если есть активный сезон)
    if (seasonId && reward.xp_reward) {
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);
      const userIds = (members ?? []).map((m: any) => m.user_id as string).filter(Boolean);
      for (const uid of userIds) {
        const { data: progress } = await supabase
          .from("season_progress")
          .select("xp")
          .eq("user_id", uid)
          .eq("season_id", seasonId)
          .maybeSingle();
        const currentXp = Number((progress as any)?.xp ?? 0) || 0;
        await supabase
          .from("season_progress")
          .upsert(
            { user_id: uid, season_id: seasonId, xp: currentXp + reward.xp_reward, level: 1 },
            { onConflict: "user_id,season_id" }
          );

        await supabase.from("rewards_log").insert({
          user_id: uid,
          source_type: "tournament",
          source_id: tournamentId,
          xp_delta: reward.xp_reward,
          rating_delta: 0,
          season_points_delta: 0,
          payload: {
            tournament_id: tournamentId,
            place: p.place,
            team_id: teamId,
            xp: reward.xp_reward,
            rating: reward.rating_reward,
          },
        });
      }
    }
  }

  return { ok: true, awarded: true as const, placements };
}

