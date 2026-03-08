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
    const { team_id, role } = body as { team_id?: string; role?: "captain" | "member" };

    if (!team_id || typeof team_id !== "string" || !team_id.trim()) {
      return NextResponse.json(
        { error: "team_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("team_members")
      .insert({
        team_id: team_id.trim(),
        user_id: user.id,
        role: role === "captain" ? "captain" : "member",
      })
      .select("id, team_id, user_id, role, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Already a member of this team" },
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
