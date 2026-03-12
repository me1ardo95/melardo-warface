import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { onTournamentMatchCompleted } from "@/lib/tournament-flow";

type Body =
  | { action: "restart_match"; match_id: string }
  | { action: "disqualify_team"; tournament_id: string; team_id: string }
  | { action: "set_result"; match_id: string; score_team1: number; score_team2: number };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: apiError("Необходима авторизация", 401) };

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (prof?.role !== "admin") {
    return { supabase, error: apiError("Доступ запрещён", 403) };
  }
  return { supabase, userId: user.id as string };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const supabase = auth.supabase;

  const body = (await request.json().catch(() => ({}))) as Partial<Body>;
  const action = body.action;

  if (action === "restart_match") {
    const matchId = typeof (body as any).match_id === "string" ? (body as any).match_id.trim() : "";
    if (!matchId) return apiError("Не указан match_id", 400);

    await supabase.from("match_confirmations").delete().eq("match_id", matchId);
    await supabase
      .from("matches")
      .update({
        status: "awaiting_result",
        score_team1: 0,
        score_team2: 0,
        completed_at: null,
        points_awarded: false,
      })
      .eq("id", matchId);

    await supabase
      .from("tournament_brackets")
      .update({ winner_team_id: null })
      .eq("match_id", matchId);

    return apiSuccess({ success: true });
  }

  if (action === "set_result") {
    const matchId = typeof (body as any).match_id === "string" ? (body as any).match_id.trim() : "";
    const s1 = Number((body as any).score_team1);
    const s2 = Number((body as any).score_team2);
    if (!matchId) return apiError("Не указан match_id", 400);
    if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 < 0 || s2 < 0 || s1 > 100 || s2 > 100) {
      return apiError("Некорректный счёт (0–100)", 400);
    }

    const { data: match } = await supabase
      .from("matches")
      .select("id, team1_id, team2_id, tournament_id, points_awarded")
      .eq("id", matchId)
      .single();
    if (!match) return apiError("Матч не найден", 404);
    if (!match.team1_id || !match.team2_id) return apiError("В матче должны быть две команды", 400);

    await supabase
      .from("matches")
      .update({
        status: "completed",
        score_team1: s1,
        score_team2: s2,
        completed_at: new Date().toISOString(),
        points_awarded: match.points_awarded ?? false,
      })
      .eq("id", matchId);

    const winnerTeamId = s1 > s2 ? (match.team1_id as string) : (match.team2_id as string);
    if (match.tournament_id) {
      await onTournamentMatchCompleted({
        supabase,
        matchId,
        tournamentId: match.tournament_id as string,
        winnerTeamId,
      });
    }

    return apiSuccess({ success: true });
  }

  if (action === "disqualify_team") {
    const tournamentId =
      typeof (body as any).tournament_id === "string" ? (body as any).tournament_id.trim() : "";
    const teamId = typeof (body as any).team_id === "string" ? (body as any).team_id.trim() : "";
    if (!tournamentId) return apiError("Не указан tournament_id", 400);
    if (!teamId) return apiError("Не указан team_id", 400);

    await supabase
      .from("tournament_teams")
      .update({ status: "disqualified" })
      .eq("tournament_id", tournamentId)
      .eq("team_id", teamId);

    // Если команда стоит в текущем матче и победитель ещё не определён — автоматически отдаём победу сопернику.
    const { data: rows } = await supabase
      .from("tournament_brackets")
      .select("id, match_id, team1_id, team2_id, winner_team_id")
      .eq("tournament_id", tournamentId)
      .is("winner_team_id", null)
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`);

    for (const r of (rows ?? []) as any[]) {
      const opponent =
        r.team1_id === teamId ? (r.team2_id as string | null) : (r.team1_id as string | null);
      if (!opponent) continue;

      // Если матч уже создан — завершаем его техническим счётом и прогрессим сетку.
      if (r.match_id) {
        const { data: m } = await supabase
          .from("matches")
          .select("team1_id, team2_id")
          .eq("id", r.match_id as string)
          .maybeSingle();
        if (m?.team1_id && m?.team2_id) {
          const score1 = m.team1_id === opponent ? 1 : 0;
          const score2 = m.team2_id === opponent ? 1 : 0;
          await supabase
            .from("matches")
            .update({
              status: "completed",
              score_team1: score1,
              score_team2: score2,
              completed_at: new Date().toISOString(),
              points_awarded: false,
            })
            .eq("id", r.match_id as string);

          await onTournamentMatchCompleted({
            supabase,
            matchId: r.match_id as string,
            tournamentId,
            winnerTeamId: opponent,
          });
        } else {
          await supabase
            .from("tournament_brackets")
            .update({ winner_team_id: opponent })
            .eq("id", r.id as string);
        }
      } else {
        await supabase
          .from("tournament_brackets")
          .update({ winner_team_id: opponent })
          .eq("id", r.id as string);
      }
    }

    return apiSuccess({ success: true });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}

