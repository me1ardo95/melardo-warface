import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications";
import { MIN_RANK_MATCH } from "@/lib/warface";
import { TRUST_SCORE_MIN_FOR_CHALLENGE } from "@/lib/trust-score";

const VALID_MODES = ["3x3", "4x4", "5x5", "6x6", "7x7", "8x8"] as const;

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
      teamId?: string;
      mode?: string;
      map?: string;
      format?: string;
      rounds?: string;
      comment?: string;
    };

    const teamId =
      typeof body.teamId === "string" && body.teamId.trim()
        ? body.teamId.trim()
        : "";
    const mode =
      body.mode && VALID_MODES.includes(body.mode as (typeof VALID_MODES)[number])
        ? body.mode
        : "5x5";
    const map =
      typeof body.map === "string" && body.map.trim() ? body.map.trim() : null;
    const format =
      typeof body.format === "string" && body.format.trim()
        ? body.format.trim()
        : "BO1";
    const rounds =
      typeof body.rounds === "string" && body.rounds.trim()
        ? body.rounds.trim()
        : "6 раундов, овертайм включен";
    const comment =
      typeof body.comment === "string" && body.comment.trim()
        ? body.comment.trim()
        : null;

    if (!teamId) {
      return NextResponse.json(
        { error: "Выберите команду" },
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

    // Проверка минимального ранга и trust_score
    const { data: profile } = await supabase
      .from("profiles")
      .select("rank, trust_score")
      .eq("id", user.id)
      .single();
    const rank = profile?.rank ?? 1;
    const trustScore = profile?.trust_score ?? 80;
    if (rank < MIN_RANK_MATCH) {
      return NextResponse.json(
        {
          error: `Минимальный ранг для участия в матчах: ${MIN_RANK_MATCH}. Ваш ранг: ${rank}.`,
        },
        { status: 403 }
      );
    }
    if (trustScore < TRUST_SCORE_MIN_FOR_CHALLENGE) {
      return NextResponse.json(
        {
          error: `Рейтинг доверия слишком низкий (${trustScore}). Минимум ${TRUST_SCORE_MIN_FOR_CHALLENGE} для создания вызовов.`,
        },
        { status: 403 }
      );
    }

    const scheduled_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("public_challenges")
      .insert({
        team_id: teamId,
        mode,
        map,
        format,
        rounds,
        scheduled_at,
        comment,
        status: "active",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    try {
      const [{ data: team }, { data: captains }] = await Promise.all([
        supabase
          .from("teams")
          .select("id, name")
          .eq("id", teamId)
          .single(),
        supabase
          .from("team_members")
          .select("team_id, user_id")
          .eq("role", "captain"),
      ]);

      const teamName = team?.name ?? "Команда";
      const when =
        scheduled_at && new Date(scheduled_at).toLocaleString("ru-RU");

      const title = "Открытый вызов от команды";
      const message = `Команда ${teamName} ищет соперника! Режим: ${mode}${
        map ? `, карта: ${map}` : ""
      }${when ? `, время: ${when}` : ""}`;

      (captains ?? [])
        .filter((c) => c.team_id !== teamId)
        .forEach((c) => {
          void sendNotification(
            c.user_id as string,
            "challenge",
            title,
            message,
            "/matches"
          );
        });
    } catch {
      // уведомления не критичны
    }

    return NextResponse.json(data);
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

