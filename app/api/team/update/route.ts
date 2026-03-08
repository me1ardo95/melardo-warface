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

    const body = await request.json();
    const teamId = body?.team_id as string | undefined;
    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json(
        { error: "Укажите команду" },
        { status: 400 }
      );
    }

    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "captain") {
      return NextResponse.json(
        { error: "Только капитан может редактировать команду" },
        { status: 403 }
      );
    }

    const { logo_url, description, city } = body as {
      team_id?: string;
      logo_url?: string | null;
      description?: string | null;
      city?: string | null;
    };

    const updates: { logo_url?: string | null; description?: string | null; city?: string | null } = {};
    if (logo_url !== undefined) {
      updates.logo_url =
        typeof logo_url === "string" && logo_url.trim()
          ? logo_url.trim()
          : null;
    }
    if (description !== undefined) {
      updates.description =
        typeof description === "string" ? description.trim() || null : null;
    }
    if (city !== undefined) {
      updates.city =
        typeof city === "string" ? city.trim() || null : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Нет данных для обновления" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("teams")
      .update(updates)
      .eq("id", teamId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
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
