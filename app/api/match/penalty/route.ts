import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api-response";
import { PENALTY_POINTS } from "@/lib/warface";
import { TRUST_DELTA } from "@/lib/trust-score";

type PenaltyReason = "false_result" | "missing_screenshot" | "cheating" | "other";

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
    const { match_id, team_id, reason } = body as {
      match_id?: string;
      team_id?: string;
      reason?: PenaltyReason;
    };

    if (!match_id || !team_id) {
      return apiError("Укажите match_id и team_id", 400);
    }
    const validReasons: PenaltyReason[] = ["false_result", "missing_screenshot", "cheating", "other"];
    const penaltyReason: PenaltyReason = validReasons.includes(reason as PenaltyReason) ? (reason as PenaltyReason) : "other";

    const { data: match } = await supabase
      .from("matches")
      .select("id, team1_id, team2_id, status")
      .eq("id", match_id)
      .single();

    if (!match) return apiError("Матч не найден", 404);
    const teamIds = [match.team1_id, match.team2_id].filter(Boolean);
    if (!teamIds.includes(team_id)) {
      return apiError("Указанная команда не участвует в матче", 400);
    }

    const pointsDelta = -PENALTY_POINTS;

    const { data: teamRow } = await supabase
      .from("teams")
      .select("id, points")
      .eq("id", team_id)
      .single();

    if (!teamRow) return apiError("Команда не найдена", 404);

    const newTeamPoints = Math.max(0, (teamRow.points ?? 0) + pointsDelta);

    await supabase.from("teams").update({ points: newTeamPoints }).eq("id", team_id);
    await supabase.from("team_points_history").insert({
      team_id,
      delta: pointsDelta,
      comment: `Штраф за матч ${match_id}: ${penaltyReason}`,
    });

    const { data: members } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", team_id);

    for (const m of members ?? []) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", m.user_id)
        .single();
      const newPlayerPoints = Math.max(0, (prof?.points ?? 0) + pointsDelta);
      await supabase.from("profiles").update({ points: newPlayerPoints }).eq("id", m.user_id);
      await supabase.from("profile_points_history").insert({
        profile_id: m.user_id,
        delta: pointsDelta,
        comment: `Штраф за матч ${match_id}: ${penaltyReason}`,
      });
    }

    await supabase.from("match_penalties").insert({
      match_id,
      team_id,
      reason: penaltyReason,
      points_delta: pointsDelta,
      admin_id: user.id,
    });

    const trustDelta = TRUST_DELTA.CONFIRMED_CHEATING;
    const serviceSupabase = createServiceClient();
    for (const m of members ?? []) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("trust_score")
        .eq("id", m.user_id)
        .single();
      const current = prof?.trust_score ?? 80;
      const newTrust = Math.max(0, Math.min(100, current + trustDelta));
      await supabase.from("profiles").update({ trust_score: newTrust }).eq("id", m.user_id);
      await serviceSupabase.from("trust_score_history").insert({
        user_id: m.user_id,
        delta: trustDelta,
        reason: "confirmed_cheating",
      });
    }

    return apiSuccess({
      success: true,
      message: `Штраф ${PENALTY_POINTS} очков выдан команде`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return apiError(msg, 500);
  }
}
