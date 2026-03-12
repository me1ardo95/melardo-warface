"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getDailyPeriodKey,
  getWeeklyPeriodKey,
  getActiveSeason,
  type Mission,
  type PlayerMission,
} from "@/lib/missions";

export type MissionWithProgress = Mission & {
  progress: number;
  completed: boolean;
  completed_at: string | null;
};

export async function getMissionsWithProgress(
  userId: string
): Promise<{
  daily: MissionWithProgress[];
  weekly: MissionWithProgress[];
  seasonal: MissionWithProgress[];
}> {
  const supabase = await createClient();
  const dailyKey = getDailyPeriodKey();
  const weeklyKey = getWeeklyPeriodKey();
  const season = await getActiveSeason();

  const [dailyMissions, weeklyMissions, seasonalMissions] = await Promise.all([
    supabase
      .from("missions")
      .select("*")
      .eq("type", "daily")
      .eq("period_key", dailyKey)
      .order("created_at"),
    supabase
      .from("missions")
      .select("*")
      .eq("type", "weekly")
      .eq("period_key", weeklyKey)
      .order("created_at"),
    season
      ? supabase
          .from("missions")
          .select("*")
          .eq("type", "seasonal")
          .eq("period_key", season.id)
          .order("created_at")
      : Promise.resolve({ data: [] as Mission[] }),
  ]);

  const allMissionIds = [
    ...(dailyMissions.data ?? []).map((m) => m.id),
    ...(weeklyMissions.data ?? []).map((m) => m.id),
    ...(seasonalMissions.data ?? []).map((m) => m.id),
  ];

  let progressMap = new Map<string, { progress: number; completed: boolean; completed_at: string | null }>();
  if (allMissionIds.length > 0) {
    const { data: pms } = await supabase
      .from("player_missions")
      .select("mission_id, progress, completed, completed_at")
      .eq("user_id", userId)
      .in("mission_id", allMissionIds);
    (pms ?? []).forEach((pm) => {
      progressMap.set(pm.mission_id, {
        progress: pm.progress,
        completed: pm.completed,
        completed_at: pm.completed_at,
      });
    });
  }

  const addProgress = (m: Mission): MissionWithProgress => {
    const p = progressMap.get(m.id) ?? { progress: 0, completed: false, completed_at: null };
    return {
      ...m,
      progress: p.progress,
      completed: p.completed,
      completed_at: p.completed_at,
    };
  };

  return {
    daily: (dailyMissions.data ?? []).map(addProgress),
    weekly: (weeklyMissions.data ?? []).map(addProgress),
    seasonal: (seasonalMissions.data ?? []).map(addProgress),
  };
}

export async function getSeasonProgress(userId: string | null) {
  if (!userId) return null;
  const supabase = await createClient();
  const season = await getActiveSeason();
  if (!season) return null;

  const { data } = await supabase
    .from("season_progress")
    .select("xp, level")
    .eq("user_id", userId)
    .eq("season_id", season.id)
    .maybeSingle();

  const { data: levels } = await supabase
    .from("season_levels")
    .select("level, xp_required, reward")
    .eq("season_id", season.id)
    .order("level", { ascending: true });

  return {
    season,
    xp: data?.xp ?? 0,
    level: data?.level ?? 1,
    levels: (levels ?? []).sort((a, b) => (a.level ?? 0) - (b.level ?? 0)),
  };
}

export async function getSeasonLeaderboard(limit = 100) {
  const supabase = await createClient();
  const season = await getActiveSeason();
  if (!season) return [];

  const { data } = await supabase
    .from("season_progress")
    .select(`
      user_id,
      xp,
      level,
      profile:profiles(id, warface_nick, display_name, avatar_url)
    `)
    .eq("season_id", season.id)
    .order("xp", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row: any, i: number) => ({
    rank: i + 1,
    user_id: row.user_id,
    xp: row.xp,
    level: row.level,
    warface_nick: row.profile?.warface_nick ?? "—",
    display_name: row.profile?.display_name ?? null,
    avatar_url: row.profile?.avatar_url ?? null,
  }));
}

export async function getWeeklyLeaderboard(limit = 100) {
  const supabase = await createClient();
  const { data: pph } = await supabase
    .from("profile_points_history")
    .select("profile_id, delta")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const byUser = new Map<string, number>();
  (pph ?? []).forEach((r) => {
    const prev = byUser.get(r.profile_id) ?? 0;
    byUser.set(r.profile_id, prev + (r.delta ?? 0));
  });

  const sorted = [...byUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([profile_id]) => profile_id);

  if (sorted.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, warface_nick, display_name, avatar_url")
    .in("id", sorted);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  return sorted.map((id, i) => {
    const p = profileMap.get(id);
    return {
      rank: i + 1,
      user_id: id,
      points: byUser.get(id) ?? 0,
      warface_nick: p?.warface_nick ?? "—",
      display_name: p?.display_name ?? null,
      avatar_url: p?.avatar_url ?? null,
    };
  });
}
