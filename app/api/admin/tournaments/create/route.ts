import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Tournament } from "@/lib/types";

type CreateTournamentBody = {
  name?: string;
  mode?: "5x5" | "8x8" | string;
  format?: "single_elimination" | "round_robin" | string;
  maxTeams?: number;
  startDate?: string;
  prizePool?: number;
  description?: string;
};

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

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .limit(1);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    const role =
      profiles && profiles.length > 0 ? (profiles[0]?.role as string | null) : null;

    if (role !== "admin") {
      return NextResponse.json(
        { error: "Доступ запрещён. Нужны права администратора." },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as CreateTournamentBody;

    const name =
      typeof body.name === "string" && body.name.trim() ? body.name.trim() : "";
    const mode = body.mode === "8x8" ? "8x8" : "5x5";
    const format =
      body.format === "round_robin" ? "round_robin" : "single_elimination";
    const maxTeams =
      typeof body.maxTeams === "number" && body.maxTeams > 0
        ? body.maxTeams
        : 16;
    const startDate =
      typeof body.startDate === "string" && body.startDate.trim()
        ? body.startDate.trim()
        : "";

    const prize_pool =
      typeof body.prizePool === "number" && body.prizePool > 0
        ? body.prizePool
        : null;

    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;

    if (!name) {
      return NextResponse.json(
        { error: "Укажите название турнира." },
        { status: 400 }
      );
    }

    if (!startDate) {
      return NextResponse.json(
        { error: "Укажите дату начала турнира." },
        { status: 400 }
      );
    }

    const start_date_iso = new Date(`${startDate}T00:00:00.000Z`).toISOString();

    const insertPayload: Partial<Tournament> & {
      prize_pool?: number | null;
      description?: string | null;
      max_teams?: number | null;
      game?: string | null;
      format?: string | null;
    } = {
      name,
      game: mode,
      format,
      max_teams: maxTeams,
      start_date: start_date_iso,
      end_date: null,
      status: "upcoming",
      prize_pool,
      description,
    };

    const { data, error } = await supabase
      .from("tournaments")
      .insert(insertPayload as any)
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error:
            error?.message ??
            "Не удалось создать турнир. Попробуйте ещё раз.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ id: data.id });
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

