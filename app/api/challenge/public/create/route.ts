import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PublicChallengeCreate } from "@/lib/types";
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
      teamId?: string;
      mode?: string;
      comment?: string;
    };

    const teamId =
      typeof body.teamId === "string" && body.teamId.trim()
        ? body.teamId.trim()
        : "";
    const mode = body.mode === "8x8" ? "8x8" : "5x5";
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

    const scheduled_at = new Date().toISOString();

    const payload: PublicChallengeCreate = {
      team_id: teamId,
      mode,
      scheduled_at,
      comment,
    };

    const { data, error } = await supabase
      .from("public_challenges")
      .insert({
        team_id: payload.team_id,
        mode: payload.mode,
        scheduled_at: payload.scheduled_at,
        comment: payload.comment,
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
        payload.scheduled_at &&
        new Date(payload.scheduled_at).toLocaleString("ru-RU");

      const title = "Открытый вызов от команды";
      const message = `Команда ${teamName} ищет соперника! Режим: ${payload.mode}${
        when ? `, время: ${when}` : ""
      }`;

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

