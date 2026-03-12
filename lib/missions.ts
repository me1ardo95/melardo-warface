/**
 * Система миссий и сезонов (FACEIT-стиль)
 * Обновление прогресса, начисление наград
 */

import { createServiceClient } from "@/lib/supabase/service";
import { enqueueTelegramNotification } from "@/lib/telegram-queue";

export type MissionType = "daily" | "weekly" | "seasonal";
export type ObjectiveType =
  | "play_matches"
  | "win_matches"
  | "win_streak"
  | "play_different_maps";

export type Mission = {
  id: string;
  title: string;
  description: string | null;
  type: MissionType;
  period_key: string;
  objective_type: ObjectiveType;
  objective_value: number;
  reward_xp: number;
  reward_rating: number;
  season_id: string | null;
  created_at: string;
};

export type PlayerMission = {
  id: string;
  user_id: string;
  mission_id: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
  mission?: Mission;
};

export function getDailyPeriodKey(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function getWeeklyPeriodKey(): string {
  const d = new Date();
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay() + 1);
  return start.toISOString().slice(0, 10); // Понедельник
}

/** Получить активный сезон */
export async function getActiveSeason(): Promise<{
  id: string;
  name: string;
  start_date: string;
  end_date: string;
} | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return data as typeof data extends null ? null : NonNullable<typeof data>;
}

/** Обновить прогресс миссий после матча */
export async function updateMissionProgressOnMatchComplete(
  userIds: string[],
  matchData: {
    team1_id: string;
    team2_id: string;
    score_team1: number;
    score_team2: number;
    map: string | null;
    winner_team_id: string | null;
  }
): Promise<void> {
  if (userIds.length === 0) return;

  const supabase = createServiceClient();
  const dailyKey = getDailyPeriodKey();
  const weeklyKey = getWeeklyPeriodKey();
  const activeSeason = await getActiveSeason();
  const seasonId = activeSeason?.id ?? null;

  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("user_id, team_id")
    .in("user_id", userIds)
    .in("team_id", [matchData.team1_id, matchData.team2_id]);

  const userTeamMap = new Map<string, string>();
  (teamMembers ?? []).forEach((m) => {
    userTeamMap.set(m.user_id, m.team_id);
  });

  const winnerId = matchData.winner_team_id;
  const mapName = matchData.map ?? "unknown";

  for (const userId of userIds) {
    const teamId = userTeamMap.get(userId);
    if (!teamId) continue;

    const isWin = winnerId === teamId;

    await updateProgressForUser(supabase, userId, {
      type: "play_matches",
      increment: 1,
      dailyKey,
      weeklyKey,
      seasonId,
    });

    if (isWin) {
      await updateProgressForUser(supabase, userId, {
        type: "win_matches",
        increment: 1,
        dailyKey,
        weeklyKey,
        seasonId,
      });

      const newStreak = await updateWinStreak(supabase, userId, seasonId);
      await updateProgressForUser(supabase, userId, {
        type: "win_streak",
        value: newStreak,
        dailyKey,
        weeklyKey,
        seasonId,
      });
    } else {
      await resetWinStreak(supabase, userId);
    }

    await recordMapPlayed(supabase, userId, mapName, dailyKey, "daily");
    await recordMapPlayed(supabase, userId, mapName, weeklyKey, "weekly");
    if (seasonId) {
      await recordMapPlayed(supabase, userId, mapName, seasonId, "seasonal");
    }

    await updatePlayDifferentMapsProgress(supabase, userId, dailyKey, "daily");
    await updatePlayDifferentMapsProgress(supabase, userId, weeklyKey, "weekly");
    if (seasonId) {
      await updatePlayDifferentMapsProgress(supabase, userId, seasonId, "seasonal");
    }
  }
}

async function updateProgressForUser(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  opts: {
    type: ObjectiveType;
    increment?: number;
    value?: number;
    dailyKey: string;
    weeklyKey: string;
    seasonId: string | null;
  }
): Promise<void> {
  const periods: { type: MissionType; key: string }[] = [
    { type: "daily", key: opts.dailyKey },
    { type: "weekly", key: opts.weeklyKey },
  ];
  if (opts.seasonId) {
    periods.push({ type: "seasonal", key: opts.seasonId });
  }

  for (const { type, key } of periods) {
    const { data: missions } = await supabase
      .from("missions")
      .select("id, objective_type, objective_value, reward_xp, reward_rating, title")
      .eq("type", type)
      .eq("period_key", key)
      .eq("objective_type", opts.type);

    if (!missions?.length) continue;

    for (const mission of missions) {
      const current = await getOrCreatePlayerMission(supabase, userId, mission.id);
      if (current.completed) continue;

      const progressDelta = opts.increment ?? 0;
      const checkValue = opts.value ?? current.progress + progressDelta;
      const newProgress = opts.increment != null ? current.progress + opts.increment : checkValue;
      const cappedProgress = Math.min(newProgress, mission.objective_value);
      const completed = cappedProgress >= mission.objective_value;

      await supabase
        .from("player_missions")
        .upsert(
          {
            user_id: userId,
            mission_id: mission.id,
            progress: cappedProgress,
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,mission_id" }
        );

      if (completed) {
        await awardMissionReward(supabase, userId, mission, type, opts.seasonId);
      }
    }
  }
}

async function getOrCreatePlayerMission(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  missionId: string
): Promise<{ progress: number; completed: boolean }> {
  const { data } = await supabase
    .from("player_missions")
    .select("progress, completed")
    .eq("user_id", userId)
    .eq("mission_id", missionId)
    .maybeSingle();

  if (data) return data;

  await supabase.from("player_missions").insert({
    user_id: userId,
    mission_id: missionId,
    progress: 0,
    completed: false,
  });
  return { progress: 0, completed: false };
}

async function awardMissionReward(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  mission: { id: string; reward_xp: number; reward_rating: number; title: string },
  missionType: MissionType,
  seasonId: string | null
): Promise<void> {
  const xp = mission.reward_xp ?? 0;
  const rating = mission.reward_rating ?? 0;

  await supabase.from("rewards_log").insert({
    user_id: userId,
    source_type: "mission",
    source_id: mission.id,
    xp_delta: xp,
    rating_delta: rating,
    season_points_delta: xp,
  });

  if (rating !== 0) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", userId)
      .single();
    const newPoints = (prof?.points ?? 0) + rating;
    await supabase.from("profiles").update({ points: newPoints }).eq("id", userId);
    await supabase.from("profile_points_history").insert({
      profile_id: userId,
      delta: rating,
      comment: `Миссия: ${mission.title}`,
    });
  }

  if (xp > 0 && seasonId) {
    const { data: sp } = await supabase
      .from("season_progress")
      .select("xp, level")
      .eq("user_id", userId)
      .eq("season_id", seasonId)
      .maybeSingle();

    const prevXp = sp?.xp ?? 0;
    const newXp = prevXp + xp;
    const newLevel = await computeLevel(supabase, seasonId, newXp);

    await supabase
      .from("season_progress")
      .upsert(
        {
          user_id: userId,
          season_id: seasonId,
          xp: newXp,
          level: newLevel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,season_id" }
      );
  }

  const title = "Миссия выполнена!";
  const msg = [mission.title, xp > 0 ? `+${xp} XP` : null, rating > 0 ? `+${rating} рейтинг` : null]
    .filter(Boolean)
    .join(" • ");
  await supabase.from("notifications").insert({
    user_id: userId,
    team_id: null,
    type: "mission_completed",
    title,
    message: msg,
    link: "/missions",
  });
  void enqueueTelegramNotification(userId, "mission_completed", {
    title: mission.title,
    xp,
    rating,
  });
}

async function computeLevel(
  supabase: ReturnType<typeof createServiceClient>,
  seasonId: string,
  xp: number
): Promise<number> {
  const { data: levels } = await supabase
    .from("season_levels")
    .select("level, xp_required")
    .eq("season_id", seasonId)
    .order("xp_required", { ascending: true });

  if (!levels?.length) return 1;

  let level = 1;
  for (const l of levels) {
    if (xp >= (l.xp_required ?? 0)) level = l.level;
  }
  return level;
}

async function updateWinStreak(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  seasonId: string | null
): Promise<number> {
  const { data } = await supabase
    .from("player_win_streaks")
    .select("current_streak")
    .eq("user_id", userId)
    .maybeSingle();

  const streak = (data?.current_streak ?? 0) + 1;
  await supabase
    .from("player_win_streaks")
    .upsert(
      {
        user_id: userId,
        season_id: seasonId,
        current_streak: streak,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  return streak;
}

async function resetWinStreak(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<void> {
  await supabase
    .from("player_win_streaks")
    .upsert(
      {
        user_id: userId,
        current_streak: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
}

async function recordMapPlayed(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  mapName: string,
  periodKey: string,
  missionType: string
): Promise<void> {
  await supabase.from("player_maps_played").upsert(
    {
      user_id: userId,
      map_name: mapName,
      period_key: periodKey,
      mission_type: missionType,
    },
    { onConflict: "user_id,map_name,period_key,mission_type" }
  );
}

async function updatePlayDifferentMapsProgress(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  periodKey: string,
  missionType: string
): Promise<void> {
  const { count } = await supabase
    .from("player_maps_played")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("period_key", periodKey)
    .eq("mission_type", missionType);

  const uniqueMaps = count ?? 0;

  const typeCol = missionType === "seasonal" ? "seasonal" : missionType;
  const { data: missions } = await supabase
    .from("missions")
    .select("id, objective_value, reward_xp, reward_rating, title")
    .eq("type", typeCol)
    .eq("period_key", periodKey)
    .eq("objective_type", "play_different_maps");

  if (!missions?.length) return;

  for (const mission of missions) {
    const current = await getOrCreatePlayerMission(supabase, userId, mission.id);
    if (current.completed) continue;

    const newProgress = uniqueMaps;
    const completed = newProgress >= mission.objective_value;

    await supabase
      .from("player_missions")
      .upsert(
        {
          user_id: userId,
          mission_id: mission.id,
          progress: newProgress,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,mission_id" }
      );

    if (completed) {
      const seasonId = missionType === "seasonal" ? periodKey : null;
      await awardMissionReward(supabase, userId, mission, typeCol as MissionType, seasonId);
    }
  }
}

/** Генерация миссий — вызывается из cron */
export async function generateDailyMissions(): Promise<number> {
  const supabase = createServiceClient();
  const key = getDailyPeriodKey();

  const { data: existing } = await supabase
    .from("missions")
    .select("id")
    .eq("type", "daily")
    .eq("period_key", key)
    .limit(1);

  if (existing?.length) return 0;

  const templates: Array<{
    title: string;
    description: string;
    type: "daily";
    period_key: string;
    objective_type: ObjectiveType;
    objective_value: number;
    reward_xp: number;
    reward_rating: number;
  }> = [
    {
      title: "Сыграть 3 матча",
      description: "Сыграйте 3 матча за день",
      type: "daily",
      period_key: key,
      objective_type: "play_matches",
      objective_value: 3,
      reward_xp: 100,
      reward_rating: 5,
    },
    {
      title: "Одна победа",
      description: "Выиграйте 1 матч",
      type: "daily",
      period_key: key,
      objective_type: "win_matches",
      objective_value: 1,
      reward_xp: 150,
      reward_rating: 10,
    },
    {
      title: "Разные карты",
      description: "Сыграйте на 2 разных картах",
      type: "daily",
      period_key: key,
      objective_type: "play_different_maps",
      objective_value: 2,
      reward_xp: 80,
      reward_rating: 5,
    },
  ];

  const { data: inserted } = await supabase
    .from("missions")
    .insert(templates)
    .select("id");
  return inserted?.length ?? 0;
}

export async function generateWeeklyMissions(): Promise<number> {
  const supabase = createServiceClient();
  const key = getWeeklyPeriodKey();

  const { data: existing } = await supabase
    .from("missions")
    .select("id")
    .eq("type", "weekly")
    .eq("period_key", key)
    .limit(1);

  if (existing?.length) return 0;

  const templates = [
    {
      title: "Сыграть 10 матчей",
      description: "Сыграйте 10 матчей за неделю",
      type: "weekly",
      period_key: key,
      objective_type: "play_matches" as const,
      objective_value: 10,
      reward_xp: 500,
      reward_rating: 25,
    },
    {
      title: "5 побед",
      description: "Выиграйте 5 матчей",
      type: "weekly",
      period_key: key,
      objective_type: "win_matches" as const,
      objective_value: 5,
      reward_xp: 600,
      reward_rating: 30,
    },
    {
      title: "Серия из 3 побед",
      description: "Выиграйте 3 матча подряд",
      type: "weekly",
      period_key: key,
      objective_type: "win_streak" as const,
      objective_value: 3,
      reward_xp: 400,
      reward_rating: 20,
    },
    {
      title: "4 разные карты",
      description: "Сыграйте на 4 разных картах",
      type: "weekly",
      period_key: key,
      objective_type: "play_different_maps" as const,
      objective_value: 4,
      reward_xp: 300,
      reward_rating: 15,
    },
  ];

  const { data: inserted } = await supabase.from("missions").insert(templates).select("id");
  return inserted?.length ?? 0;
}

export async function generateSeasonalMissions(): Promise<number> {
  const season = await getActiveSeason();
  if (!season) return 0;

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("missions")
    .select("id")
    .eq("type", "seasonal")
    .eq("period_key", season.id)
    .limit(1);

  if (existing?.length) return 0;

  const templates = [
    {
      title: "50 матчей за сезон",
      description: "Сыграйте 50 матчей в течение сезона",
      type: "seasonal",
      period_key: season.id,
      objective_type: "play_matches" as const,
      objective_value: 50,
      reward_xp: 2000,
      reward_rating: 100,
      season_id: season.id,
    },
    {
      title: "25 побед за сезон",
      description: "Выиграйте 25 матчей",
      type: "seasonal",
      period_key: season.id,
      objective_type: "win_matches" as const,
      objective_value: 25,
      reward_xp: 2500,
      reward_rating: 125,
      season_id: season.id,
    },
    {
      title: "Серия из 5 побед",
      description: "Выиграйте 5 матчей подряд",
      type: "seasonal",
      period_key: season.id,
      objective_type: "win_streak" as const,
      objective_value: 5,
      reward_xp: 1500,
      reward_rating: 75,
      season_id: season.id,
    },
  ];

  const { data: inserted } = await supabase.from("missions").insert(templates).select("id");
  return inserted?.length ?? 0;
}
