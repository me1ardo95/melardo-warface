import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RegisterBody = {
  tournament_id?: string;
  team_id?: string;
};

type SuccessResponse = {
  success: true;
};

type ErrorResponse = {
  success: false;
  error: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const body: ErrorResponse = {
        success: false,
        error: "Необходима авторизация",
      };
      return NextResponse.json(body, { status: 401 });
    }

    const rawBody = (await request.json().catch(() => ({}))) as RegisterBody;
    const tournamentId =
      typeof rawBody.tournament_id === "string" &&
      rawBody.tournament_id.trim()
        ? rawBody.tournament_id.trim()
        : "";
    const teamId =
      typeof rawBody.team_id === "string" && rawBody.team_id.trim()
        ? rawBody.team_id.trim()
        : "";

    if (!tournamentId) {
      const body: ErrorResponse = {
        success: false,
        error: "tournament_id is required",
      };
      return NextResponse.json(body, { status: 400 });
    }

    if (!teamId) {
      const body: ErrorResponse = {
        success: false,
        error: "team_id is required",
      };
      return NextResponse.json(body, { status: 400 });
    }

    // Check if this team is already registered for the tournament
    const { data: existing } = await supabase
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("team_id", teamId)
      .maybeSingle();

    if (existing) {
      const body: ErrorResponse = {
        success: false,
        error: "This team is already registered for the tournament.",
      };
      return NextResponse.json(body, { status: 409 });
    }

    const { error: insertError } = await supabase
      .from("tournament_registrations")
      .insert({
        tournament_id: tournamentId,
        team_id: teamId,
      });

    if (insertError) {
      // In case of race condition and unique constraint violation
      if (insertError.code === "23505") {
        const body: ErrorResponse = {
          success: false,
          error: "This team is already registered for the tournament.",
        };
        return NextResponse.json(body, { status: 409 });
      }

      const body: ErrorResponse = {
        success: false,
        error: insertError.message,
      };
      return NextResponse.json(body, { status: 400 });
    }

    const body: SuccessResponse = { success: true };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    const body: ErrorResponse = {
      success: false,
      error:
        err instanceof Error ? err.message : "Internal server error",
    };
    return NextResponse.json(body, { status: 500 });
  }
}

