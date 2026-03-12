import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logSystemError } from "@/lib/system-log";
import { apiError, apiSuccess } from "@/lib/api-response";
import { enqueueTelegramNotification } from "@/lib/telegram-queue";
import { updateMissionProgressOnMatchComplete } from "@/lib/missions";
import { updateClanRatingOnMatchComplete } from "@/lib/clan-rating";
import { onTournamentMatchCompleted } from "@/lib/tournament-flow";

const TEAM_POINTS_PER_MATCH_WIN = 10;
const PLAYER_POINTS_PER_MATCH_WIN = 5;
const TEAM_POINTS_PER_TOURNAMENT_WIN = 25;
const PLAYER_POINTS_PER_TOURNAMENT_WIN = 10;

async function logAdminAction(
  userId: string,
  action: string,
  details: Record<string, unknown>
) {
  await logSystemError("admin_action", action, {
    admin_id: userId,
    ...details,
  });
}

async function isFinalTournamentMatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string
): Promise<boolean> {
  const { data: bracket } = await supabase
    .from("tournament_brackets")
    .select("round")
    .eq("match_id", matchId)
    .limit(1)
    .maybeSingle();
  if (bracket) {
    return String((bracket as any).round ?? "") === "final";
  }
  const { data } = await supabase
    .from("matches")
    .select("next_match_id")
    .eq("id", matchId)
    .single();
  return data?.next_match_id === null;
}

async function awardPointsAndComplete(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  score1: number,
  score2: number,
  screenshotUrl: string | null
) {
  const { data: match } = await supabase
    .from("matches")
    .select("team1_id, team2_id, tournament_id")
    .eq("id", matchId)
    .single();
  if (!match) return;

  await supabase
    .from("match_confirmations")
    .update({ status: "confirmed" })
    .eq("match_id", matchId);

  await supabase
    .from("matches")
    .update({
      status: "completed",
      score_team1: score1,
      score_team2: score2,
      completed_at: new Date().toISOString(),
      points_awarded: true,
      screenshot_url: screenshotUrl,
    })
    .eq("id", matchId);

  const winnerId = score1 > score2 ? match.team1_id : match.team2_id;
  if (winnerId) {
    const isFinal = await isFinalTournamentMatch(supabase, matchId);
    const teamDelta =
      TEAM_POINTS_PER_MATCH_WIN +
      (isFinal ? TEAM_POINTS_PER_TOURNAMENT_WIN : 0);
    const playerDelta =
      PLAYER_POINTS_PER_MATCH_WIN +
      (isFinal ? PLAYER_POINTS_PER_TOURNAMENT_WIN : 0);

    const { data: teamRow } = await supabase
      .from("teams")
      .select("points")
      .eq("id", winnerId)
      .single();
    await supabase
      .from("teams")
      .update({ points: (teamRow?.points ?? 0) + teamDelta })
      .eq("id", winnerId);

    await supabase.from("team_points_history").insert({
      team_id: winnerId,
      delta: teamDelta,
      comment: `Победа в матче (${matchId})`,
    });

    const { data: members } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", winnerId);
    for (const m of members ?? []) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", m.user_id)
        .single();
      await supabase
        .from("profiles")
        .update({ points: (prof?.points ?? 0) + playerDelta })
        .eq("id", m.user_id);
      await supabase.from("profile_points_history").insert({
        profile_id: m.user_id,
        delta: playerDelta,
        comment: `Победа в матче (${matchId})`,
      });
    }

    if (match.tournament_id) {
      await onTournamentMatchCompleted({
        supabase,
        matchId,
        tournamentId: match.tournament_id as string,
        winnerTeamId: winnerId as string,
      });
    }
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return apiError("Необходима авторизация", 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return apiError("Доступ запрещён", 403);
    }

    const body = await request.json().catch(() => ({}));
    const {
      match_id,
      action,
      score_team1: s1Raw,
      score_team2: s2Raw,
      use_team_id,
    } = body as {
      match_id?: string;
      action?: "approve" | "reject" | "change_score";
      score_team1?: number;
      score_team2?: number;
      use_team_id?: string;
    };

    if (!match_id || typeof match_id !== "string") {
      return apiError("Не указан идентификатор матча", 400);
    }

    const { data: match } = await supabase
      .from("matches")
      .select("id, team1_id, team2_id, status, score_team1, score_team2, points_awarded, map")
      .eq("id", match_id)
      .single();

    if (!match || match.status !== "disputed") {
      return apiError("Матч не найден или не в статусе оспаривается", 400);
    }

    if (match.points_awarded) {
      return apiError("Очки за матч уже начислены", 400);
    }

    const serviceSupabase = createServiceClient();

    if (action === "reject") {
      await supabase
        .from("matches")
        .update({
          status: "cancelled",
          score_team1: 0,
          score_team2: 0,
        })
        .eq("id", match_id);

      await serviceSupabase.from("match_history").insert({
        match_id,
        old_score_team1: match.score_team1,
        old_score_team2: match.score_team2,
        new_score_team1: 0,
        new_score_team2: 0,
        changed_by: user.id,
        action: "reject",
      });

      const { data: disputes } = await supabase
        .from("match_disputes")
        .select("id")
        .eq("match_id", match_id)
        .eq("status", "open");
      for (const d of disputes ?? []) {
        await supabase
          .from("match_disputes")
          .update({ status: "resolved", admin_comment: "Результат отклонён администратором" })
          .eq("id", d.id);
      }

      await logAdminAction(user.id, "match_dispute_reject", {
        match_id,
        reason: "Результат отклонён",
      });

      return apiSuccess({ success: true, status: "cancelled" });
    }

    let score1: number;
    let score2: number;
    let screenshotUrl: string | null = null;

    if (action === "approve" && use_team_id) {
      const { data: conf } = await supabase
        .from("match_confirmations")
        .select("score_team1, score_team2, screenshot_url")
        .eq("match_id", match_id)
        .eq("team_id", use_team_id)
        .maybeSingle();

      if (!conf) {
        return apiError("Подтверждение от указанной команды не найдено", 400);
      }
      score1 = conf.score_team1;
      score2 = conf.score_team2;
      screenshotUrl = conf.screenshot_url ?? null;
    } else if (action === "change_score") {
      const s1 = Number(s1Raw);
      const s2 = Number(s2Raw);
      if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 < 0 || s2 < 0 || s1 > 100 || s2 > 100) {
        return apiError("Укажите корректный счёт (0–100)", 400);
      }
      score1 = s1;
      score2 = s2;

      const { data: firstConf } = await supabase
        .from("match_confirmations")
        .select("screenshot_url")
        .eq("match_id", match_id)
        .limit(1)
        .maybeSingle();
      screenshotUrl = firstConf?.screenshot_url ?? null;
    } else {
      return apiError(
        "Укажите действие: approve (с use_team_id) или reject или change_score (с score_team1, score_team2)",
        400
      );
    }

    await serviceSupabase.from("match_history").insert({
      match_id,
      old_score_team1: match.score_team1,
      old_score_team2: match.score_team2,
      new_score_team1: score1,
      new_score_team2: score2,
      changed_by: user.id,
      action: action ?? "change_score",
    });

    await awardPointsAndComplete(supabase, match_id, score1, score2, screenshotUrl);

    const winnerId = score1 > score2 ? match.team1_id : match.team2_id;
    const { data: allMembers } = await supabase
      .from("team_members")
      .select("user_id")
      .in("team_id", [match.team1_id, match.team2_id]);
    const participantIds = [...new Set((allMembers ?? []).map((m) => m.user_id as string))];
    void updateMissionProgressOnMatchComplete(participantIds, {
      team1_id: match.team1_id!,
      team2_id: match.team2_id!,
      score_team1: score1,
      score_team2: score2,
      map: (match as { map?: string | null }).map ?? null,
      winner_team_id: winnerId,
    });

    void updateClanRatingOnMatchComplete(
      match_id,
      match.team1_id!,
      match.team2_id!,
      score1,
      score2
    );

    const { data: disputes } = await supabase
      .from("match_disputes")
      .select("id")
      .eq("match_id", match_id)
      .eq("status", "open");
    for (const d of disputes ?? []) {
      await supabase
        .from("match_disputes")
        .update({
          status: "resolved",
          admin_comment: action === "approve"
            ? `Принят результат команды ${use_team_id}`
            : "Счёт изменён администратором",
        })
        .eq("id", d.id);
    }

    await logAdminAction(user.id, "match_dispute_resolve", {
      match_id,
      action,
      score_team1: score1,
      score_team2: score2,
    });

    // Telegram: match_admin_resolved + match_finished for captains
    try {
      const { data: captains } = await supabase
        .from("team_members")
        .select("user_id")
        .in("team_id", [match.team1_id, match.team2_id])
        .eq("role", "captain");

      (captains ?? []).forEach((c) => {
        const uid = c.user_id as string;
        const payload = {
          match_id,
          score_team1: score1,
          score_team2: score2,
          result: action === "approve"
            ? `Принят результат команды ${use_team_id}`
            : "Счёт изменён администратором",
        };
        void enqueueTelegramNotification(uid, "match_admin_resolved", payload);
        void enqueueTelegramNotification(uid, "match_finished", payload);
      });
    } catch {
      // уведомления не критичны
    }

    return apiSuccess({ success: true, status: "completed" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return apiError(msg, 500);
  }
}
