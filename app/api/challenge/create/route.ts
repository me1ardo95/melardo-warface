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
    const {
      challenger_team_id,
      challenged_team_id,
      tournament_id,
      match_id,
      message,
    } = body as {
      challenger_team_id?: string;
      challenged_team_id?: string;
      tournament_id?: string;
      match_id?: string;
      message?: string;
    };

    if (!challenger_team_id || typeof challenger_team_id !== "string") {
      return NextResponse.json(
        { error: "challenger_team_id is required" },
        { status: 400 }
      );
    }
    if (!challenged_team_id || typeof challenged_team_id !== "string") {
      return NextResponse.json(
        { error: "challenged_team_id is required" },
        { status: 400 }
      );
    }
    if (challenger_team_id === challenged_team_id) {
      return NextResponse.json(
        { error: "Challenger and challenged team must be different" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("challenges")
      .insert({
        challenger_team_id: challenger_team_id.trim(),
        challenged_team_id: challenged_team_id.trim(),
        tournament_id: tournament_id && typeof tournament_id === "string" ? tournament_id.trim() || null : null,
        match_id: match_id && typeof match_id === "string" ? match_id.trim() || null : null,
        message: message && typeof message === "string" ? message.trim() || null : null,
      })
      .select("id, challenger_team_id, challenged_team_id, status, created_at")
      .single();

    if (error) {
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
