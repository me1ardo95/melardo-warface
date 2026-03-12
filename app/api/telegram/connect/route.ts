import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

type Body = {
  code?: string;
  telegram_id?: number;
  telegram_username?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const telegramId =
      typeof body.telegram_id === "number" ? body.telegram_id : null;
    const telegramUsername =
      typeof body.telegram_username === "string"
        ? body.telegram_username.trim()
        : null;

    if (!code || !telegramId) {
      return NextResponse.json(
        { error: "Missing code or telegram_id" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", code)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User not found for provided code" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        telegram_id: telegramId,
        telegram_username: telegramUsername,
        telegram_connected_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

