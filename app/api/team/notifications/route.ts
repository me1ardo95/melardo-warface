import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const body = await request.json().catch(() => ({}));
    const teamId = typeof body?.teamId === "string" ? body.teamId.trim() : "";

    if (!teamId) {
      return NextResponse.json(
        { error: "Не указана команда" },
        { status: 400 }
      );
    }

    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || membership.role !== "captain") {
      return NextResponse.json(
        { error: "Только капитан может просматривать уведомления команды" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data ?? []);
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

