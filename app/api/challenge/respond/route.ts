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
    const { challenge_id, status } = body as {
      challenge_id?: string;
      status?: "accepted" | "rejected";
    };

    if (!challenge_id || typeof challenge_id !== "string") {
      return NextResponse.json(
        { error: "challenge_id is required" },
        { status: 400 }
      );
    }
    if (!status || !["accepted", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'accepted' or 'rejected'" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("challenges")
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq("id", challenge_id.trim())
      .eq("status", "pending")
      .select("id, status, responded_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json(
        { error: "Challenge not found or already responded to" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
