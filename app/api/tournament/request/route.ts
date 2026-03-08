import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TournamentRequest } from "@/lib/types";

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

    const body = await request.json();
    const {
      title,
      mode,
      format,
      min_teams,
      max_teams,
      requested_date,
      comment,
      fair_play_agreed,
      fair_play_confirmed,
    } = body as {
      title?: string;
      mode?: "5x5" | "8x8";
      format?: "single_elimination" | "round_robin";
      min_teams?: number | null;
      max_teams?: number | null;
      requested_date?: string | null;
      comment?: string | null;
      fair_play_agreed?: boolean;
      fair_play_confirmed?: boolean;
    };

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Укажите название турнира" },
        { status: 400 }
      );
    }
    if (mode !== "5x5" && mode !== "8x8") {
      return NextResponse.json(
        { error: 'Режим игры должен быть "5x5" или "8x8"' },
        { status: 400 }
      );
    }
    if (format !== "single_elimination" && format !== "round_robin") {
      return NextResponse.json(
        {
          error:
            'Формат должен быть "Single Elimination" или "Round Robin"',
        },
        { status: 400 }
      );
    }
    const minTeams = typeof min_teams === "number" ? min_teams : null;
    const maxTeams = typeof max_teams === "number" ? max_teams : null;

    if (
      minTeams === null ||
      maxTeams === null ||
      Number.isNaN(minTeams) ||
      Number.isNaN(maxTeams)
    ) {
      return NextResponse.json(
        { error: "Укажите минимальное и максимальное количество команд" },
        { status: 400 }
      );
    }
    if (minTeams < 2 || maxTeams < minTeams || maxTeams > 64) {
      return NextResponse.json(
        {
          error:
            "Диапазон команд должен быть от 2 до 64, при этом максимум не меньше минимума",
        },
        { status: 400 }
      );
    }
    const fairPlayAgreed =
      typeof fair_play_agreed === "boolean"
        ? fair_play_agreed
        : !!fair_play_confirmed;

    if (!fairPlayAgreed) {
      return NextResponse.json(
        {
          error:
            "Для отправки заявки необходимо подтвердить обязательство играть честно",
        },
        { status: 400 }
      );
    }

    const insertPayload = {
      user_id: user.id,
      title: title.trim(),
      mode,
      format,
      min_teams: minTeams,
      max_teams: maxTeams,
      requested_date: requested_date || null,
      comment: comment && comment.trim() ? comment.trim() : null,
      fair_play_agreed: fairPlayAgreed,
      status: "pending" as TournamentRequest["status"],
      rejection_reason: null,
    };

    const { data, error } = await supabase
      .from("tournament_requests")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data as TournamentRequest);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Внутренняя ошибка сервера",
      },
      { status: 500 }
    );
  }
}

