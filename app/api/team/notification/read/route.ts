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
    const notificationId =
      typeof body?.notificationId === "string"
        ? body.notificationId.trim()
        : "";

    if (!notificationId) {
      return NextResponse.json(
        { error: "Не передан идентификатор уведомления" },
        { status: 400 }
      );
    }

    const { data: notification, error: fetchError } = await supabase
      .from("notifications")
      .select("id, user_id, team_id")
      .eq("id", notificationId)
      .maybeSingle();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: "Уведомление не найдено" },
        { status: 404 }
      );
    }

    if (notification.user_id && notification.user_id === user.id) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (notification.team_id) {
      const { data: membership } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", notification.team_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership || membership.role !== "captain") {
        return NextResponse.json(
          { error: "Нет прав на изменение уведомления" },
          { status: 403 }
        );
      }

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Нет прав на изменение уведомления" },
      { status: 403 }
    );
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

