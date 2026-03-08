import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PublicChallengeAccept } from "@/lib/types";
import { sendNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      challengeId?: string;
      teamId?: string;
    };

    const challengeId =
      typeof body.challengeId === "string" && body.challengeId.trim()
        ? body.challengeId.trim()
        : "";
    const teamId =
      typeof body.teamId === "string" && body.teamId.trim()
        ? body.teamId.trim()
        : "";

    if (!challengeId || !teamId) {
      return NextResponse.json(
        { error: "Не указан вызов или команда" },
        { status: 400 }
      );
    }

    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "Вы должны быть участником выбранной команды" },
        { status: 403 }
      );
    }

    const { data: challenge, error: challengeError } = await supabase
      .from("public_challenges")
      .select("id, team_id, mode, scheduled_at, status, match_id")
      .eq("id", challengeId)
      .maybeSingle();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: "Вызов не найден" },
        { status: 404 }
      );
    }

    if (challenge.status !== "active") {
      return NextResponse.json(
        { error: "Вызов уже принят или отменён" },
        { status: 400 }
      );
    }

    if (challenge.team_id === teamId) {
      return NextResponse.json(
        { error: "Нельзя принять собственный вызов" },
        { status: 400 }
      );
    }

    const payload: PublicChallengeAccept = {
      challenge_id: challenge.id,
      team_id: teamId,
    };

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .insert({
        tournament_id: null,
        team1_id: challenge.team_id,
        team2_id: payload.team_id,
        status: "scheduled",
        score_team1: 0,
        score_team2: 0,
        scheduled_at: challenge.scheduled_at,
      })
      .select("id, team1_id, team2_id, status, scheduled_at")
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { error: matchError?.message ?? "Не удалось создать матч" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("public_challenges")
      .update({
        status: "accepted",
        match_id: match.id,
      })
      .eq("id", payload.challenge_id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    try {
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", [challenge.team_id, payload.team_id]);

      const teamsMap = new Map(
        (teamsData ?? []).map((t) => [t.id as string, t.name as string])
      );

      const { data: captainsData } = await supabase
        .from("team_members")
        .select("team_id, user_id")
        .in("team_id", [challenge.team_id, payload.team_id])
        .eq("role", "captain");

      const challengerName =
        teamsMap.get(challenge.team_id as string) ?? "Команда 1";
      const accepterName =
        teamsMap.get(payload.team_id as string) ?? "Команда 2";

      const challengerCaptains = (captainsData ?? []).filter(
        (c) => c.team_id === challenge.team_id
      );
      const bothCaptains = captainsData ?? [];

      // Уведомление создателю вызова о принятии
      challengerCaptains.forEach((c) => {
        void sendNotification(
          c.user_id as string,
          "challenge",
          "Ваш вызов принят",
          `Команда ${accepterName} приняла ваш открытый вызов. Матч создан.`,
          `/matches/${match.id}`
        );
      });

      // Уведомление о создании матча обоим капитанам
      const when =
        match.scheduled_at &&
        new Date(match.scheduled_at as string).toLocaleString("ru-RU");
      const matchTitle = "Новый матч запланирован";
      const matchMessage = `Матч ${challengerName} vs ${accepterName} запланирован${
        when ? ` на ${when}` : ""
      }.`;

      bothCaptains.forEach((c) => {
        void sendNotification(
          c.user_id as string,
          "match_scheduled",
          matchTitle,
          matchMessage,
          `/matches/${match.id}`
        );
      });
    } catch {
      // уведомления не критичны
    }

    return NextResponse.json({
      success: true,
      match,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Внутренняя ошибка сервера",
      },
      { status: 500 }
    );
  }
}

