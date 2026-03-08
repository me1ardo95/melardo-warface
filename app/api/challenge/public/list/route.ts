import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PublicChallenge } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const url = new URL(request.url);
    const randomFlag = url.searchParams.get("random") === "true";

    const { data, error } = await supabase
      .from("public_challenges")
      .select(
        `
        id,
        team_id,
        mode,
        scheduled_at,
        comment,
        status,
        match_id,
        created_at,
        team:teams(id, name, logo_url, city, mode)
      `
      )
      .eq("status", "active")
      .order(randomFlag ? "created_at" : "created_at", {
        ascending: !randomFlag,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const challenges = (data ?? []) as (PublicChallenge & {
      team?: { id: string; name: string; logo_url: string | null; city?: string | null; mode?: string | null };
    })[];

    if (randomFlag && challenges.length > 0) {
      const index = Math.floor(Math.random() * challenges.length);
      return NextResponse.json([challenges[index]]);
    }

    return NextResponse.json(challenges);
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

