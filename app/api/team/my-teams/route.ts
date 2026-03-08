import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ teams: [] });
    }

    const { data: members } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id);

    if (!members?.length) {
      return NextResponse.json({ teams: [] });
    }

    const teamIds = members.map((m) => m.team_id);
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamIds)
      .order("name");

    return NextResponse.json({ teams: teams ?? [] });
  } catch {
    return NextResponse.json({ teams: [] }, { status: 500 });
  }
}
