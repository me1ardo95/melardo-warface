import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tournament_id, team_id } = body as { tournament_id?: string; team_id?: string };

    if (!tournament_id || typeof tournament_id !== "string" || !tournament_id.trim()) {
      return NextResponse.json(
        { error: "tournament_id is required" },
        { status: 400 }
      );
    }
    if (!team_id || typeof team_id !== "string" || !team_id.trim()) {
      return NextResponse.json(
        { error: "team_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tournament_registrations")
      .insert({
        tournament_id: tournament_id.trim(),
        team_id: team_id.trim(),
      })
      .select("id, tournament_id, team_id, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Team already registered for this tournament" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
