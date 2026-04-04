import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendNotification } from "@/lib/notifications";
import { enqueueTelegramNotification } from "@/lib/telegram-queue";
import {
  generateSecretPhrase,
  MIN_RANK_MATCH,
} from "@/lib/warface";

const COOLDOWN_HOURS = 24;

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

    // Проверка минимального ранга (26 для матчей)
    const { data: profile } = await supabase
      .from("profiles")
      .select("rank")
      .eq("id", user.id)
      .single();
    const rank = profile?.rank ?? 1;
    if (rank < MIN_RANK_MATCH) {
      return NextResponse.json(
        {
          error: `Минимальный ранг для участия в матчах: ${MIN_RANK_MATCH}. Ваш ранг: ${rank}.`,
        },
        { status: 403 }
      );
    }

    const { data: challenge, error: challengeError } = await supabase
      .from("public_challenges")
      .select("id, team_id, mode, map, format, rounds, scheduled_at, status, match_id")
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

    const challengerTeamId = challenge.team_id as string;
    const accepterTeamId = teamId;

    // Cooldown: команды не могут играть друг с другом более 1 матча в сутки
    const since = new Date();
    since.setHours(since.getHours() - COOLDOWN_HOURS);
    const { data: recentMatches } = await supabase
      .from("matches")
      .select("id")
      .or(
        `and(team1_id.eq.${challengerTeamId},team2_id.eq.${accepterTeamId}),and(team1_id.eq.${accepterTeamId},team2_id.eq.${challengerTeamId})`
      )
      .gte("created_at", since.toISOString())
      .limit(1);

    if (recentMatches && recentMatches.length > 0) {
      return NextResponse.json(
        {
          error: `Эти команды уже играли друг с другом менее ${COOLDOWN_HOURS} часов назад. Создание второго матча заблокировано.`,
        },
        { status: 400 }
      );
    }

    // Генерация Match ID, Lobby Code, Secret Phrase
    let matchIdNumeric: number;
    try {
      const serviceSupabase = createServiceClient();
      const { data: matchIdNumericRaw } = await serviceSupabase
        .rpc("get_next_match_id_numeric")
        .single();
      matchIdNumeric =
        typeof matchIdNumericRaw === "number"
          ? matchIdNumericRaw
          : Math.floor(10000 + Math.random() * 90000);
    } catch {
      matchIdNumeric = Math.floor(10000 + Math.random() * 90000);
    }
    const lobbyCode = `WF-${matchIdNumeric}`;
    const secretPhrase = generateSecretPhrase();

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .insert({
        tournament_id: null,
        team1_id: challengerTeamId,
        team2_id: accepterTeamId,
        creator_team_id: challengerTeamId,
        status: "awaiting_result",
        score_team1: 0,
        score_team2: 0,
        scheduled_at: challenge.scheduled_at,
        match_id_numeric: matchIdNumeric,
        lobby_code: lobbyCode,
        secret_phrase: secretPhrase,
        map: challenge.map ?? null,
        team_size: challenge.mode ?? null,
        format: challenge.format ?? "BO1",
        rounds: challenge.rounds ?? "6 раундов, овертайм включен",
      })
      .select("id, team1_id, team2_id, status, scheduled_at, match_id_numeric, lobby_code, secret_phrase")
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
      .eq("id", challengeId);

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
        .in("id", [challengerTeamId, accepterTeamId]);

      const teamsMap = new Map(
        (teamsData ?? []).map((t) => [t.id as string, t.name as string])
      );

      const { data: captainsData } = await supabase
        .from("team_members")
        .select("team_id, user_id")
        .in("team_id", [challengerTeamId, accepterTeamId])
        .eq("role", "captain");

      const challengerName =
        teamsMap.get(challengerTeamId) ?? "Команда 1";
      const accepterName =
        teamsMap.get(accepterTeamId) ?? "Команда 2";

      const challengerCaptains = (captainsData ?? []).filter(
        (c) => c.team_id === challengerTeamId
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

      // Telegram: match_created + match_accepted for captains
      const payloadBase = {
        match_id: match.id,
        lobby_code: (match as any).lobby_code ?? null,
        secret_phrase: (match as any).secret_phrase ?? null,
      };

      bothCaptains.forEach((c) => {
        const uid = c.user_id as string;
        void enqueueTelegramNotification(uid, "match_created", {
          ...payloadBase,
        });
        void enqueueTelegramNotification(uid, "match_result_confirmation_required", {
          match_id: match.id,
        });
      });

      challengerCaptains.forEach((c) => {
        const uid = c.user_id as string;
        void enqueueTelegramNotification(uid, "match_accepted", {
          ...payloadBase,
          opponent: accepterName,
        });
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

