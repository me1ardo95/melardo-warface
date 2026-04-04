import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendNotification } from "@/lib/notifications";
import { enqueueTelegramNotification } from "@/lib/telegram-queue";
import { generateSecretPhrase } from "@/lib/warface";
import { TRUST_SCORE_MIN_FOR_CHALLENGE } from "@/lib/trust-score";

const VALID_MODES = ["3x3", "4x4", "5x5", "6x6", "7x7", "8x8"] as const;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const teamId = typeof body?.teamId === "string" ? body.teamId.trim() : "";
    const mode = body?.mode && VALID_MODES.includes(body.mode as (typeof VALID_MODES)[number])
      ? body.mode
      : "5x5";

    if (!teamId) {
      return NextResponse.json({ error: "Укажите команду" }, { status: 400 });
    }

    const [{ data: membership }, { data: profile }] = await Promise.all([
      supabase.from("team_members").select("team_id").eq("team_id", teamId).eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("trust_score").eq("id", user.id).single(),
    ]);
    if (!membership) {
      return NextResponse.json({ error: "Вы не в этой команде" }, { status: 403 });
    }
    const trustScore = profile?.trust_score ?? 80;
    if (trustScore < TRUST_SCORE_MIN_FOR_CHALLENGE) {
      return NextResponse.json(
        { error: `Рейтинг доверия слишком низкий (${trustScore}). Минимум ${TRUST_SCORE_MIN_FOR_CHALLENGE} для поиска матчей.` },
        { status: 403 }
      );
    }

    const serviceSupabase = createServiceClient();

    const { data: existing } = await supabase
      .from("quick_match_queue")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "searching")
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Вы уже в очереди поиска" }, { status: 400 });
    }

    const { data: opponent } = await supabase
      .from("quick_match_queue")
      .select("id, user_id, team_id, mode")
      .eq("status", "searching")
      .eq("mode", mode)
      .neq("user_id", user.id)
      .neq("team_id", teamId)
      .limit(1)
      .maybeSingle();

    if (opponent) {
      let matchIdNumeric: number;
      try {
        const { data: raw } = await serviceSupabase.rpc("get_next_match_id_numeric").single();
        matchIdNumeric = typeof raw === "number" ? raw : Math.floor(10000 + Math.random() * 90000);
      } catch {
        matchIdNumeric = Math.floor(10000 + Math.random() * 90000);
      }

      const lobbyCode = `WF-${matchIdNumeric}`;
      const secretPhrase = generateSecretPhrase();

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          tournament_id: null,
          team1_id: opponent.team_id,
          team2_id: teamId,
          creator_team_id: opponent.team_id,
          status: "awaiting_result",
          score_team1: 0,
          score_team2: 0,
          scheduled_at: new Date().toISOString(),
          match_id_numeric: matchIdNumeric,
          lobby_code: lobbyCode,
          secret_phrase: secretPhrase,
          team_size: mode,
          format: "BO1",
          rounds: "6 раундов, овертайм включен",
        })
        .select("id, lobby_code, match_id_numeric, secret_phrase")
        .single();

      if (matchError || !match) {
        return NextResponse.json(
          { error: matchError?.message ?? "Не удалось создать матч" },
          { status: 400 }
        );
      }

      await supabase
        .from("quick_match_queue")
        .update({ status: "matched", match_id: match.id })
        .eq("id", opponent.id);

      await supabase
        .from("quick_match_queue")
        .delete()
        .eq("user_id", user.id)
        .eq("status", "searching");

      const { data: teams } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", [opponent.team_id, teamId]);
      const teamNames = new Map((teams ?? []).map((t) => [t.id, t.name]));

      const { data: captains } = await supabase
        .from("team_members")
        .select("user_id")
        .in("team_id", [opponent.team_id, teamId])
        .eq("role", "captain");

      (captains ?? []).forEach((c) => {
        void sendNotification(
          c.user_id as string,
          "match_scheduled",
          "Быстрый матч найден",
          `Соперник найден. Матч: ${teamNames.get(opponent.team_id)} vs ${teamNames.get(teamId)}`,
          `/matches/${match.id}`
        );
      });

      // Telegram: quick_match_found for captains
      const basePayload = {
        match_id: match.id,
        lobby_code: match.lobby_code,
        secret_phrase: match.secret_phrase,
      };
      (captains ?? []).forEach((c) => {
        void enqueueTelegramNotification(c.user_id as string, "quick_match_found", basePayload);
        void enqueueTelegramNotification(c.user_id as string, "match_result_confirmation_required", {
          match_id: match.id,
        });
      });

      return NextResponse.json({ success: true, match });
    }

    await supabase.from("quick_match_queue").insert({
      user_id: user.id,
      team_id: teamId,
      mode,
      status: "searching",
    });

    return NextResponse.json({
      success: true,
      queued: true,
      message: "Вы в очереди. Ожидайте соперника...",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка сервера" },
      { status: 500 }
    );
  }
}
