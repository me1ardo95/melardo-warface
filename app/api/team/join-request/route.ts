import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications";

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
    const message =
      typeof body?.message === "string" && body.message.trim()
        ? body.message.trim()
        : null;
    const teamId =
      typeof body?.team_id === "string" && body.team_id.trim()
        ? body.team_id.trim()
        : null;

    const { data: existingMember } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: "Вы уже состоите в команде" },
        { status: 400 }
      );
    }

    const { data: existingRequest } = await supabase
      .from("team_join_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingRequest) {
      return NextResponse.json(
        { error: "У вас уже есть активная заявка" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("team_join_requests")
      .insert({
        user_id: user.id,
        team_id: teamId,
        status: "pending",
        message,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (teamId) {
      try {
        const [{ data: profile }, { data: teamMembers }] = await Promise.all([
          supabase
            .from("profiles")
            .select("warface_nick, display_name")
            .eq("id", user.id)
            .single(),
          supabase
            .from("team_members")
            .select("user_id")
            .eq("team_id", teamId)
            .eq("role", "captain"),
        ]);

        const nick =
          profile?.warface_nick ??
          profile?.display_name ??
          "Игрок";
        const title = "Новая заявка в команду";
        const messageText = `Игрок ${nick} хочет присоединиться к команде.`;

        (teamMembers ?? []).forEach((m) => {
          void sendNotification(
            m.user_id as string,
            "team_join",
            title,
            messageText,
            `/teams/${teamId}`
          );
        });
      } catch {
        // уведомление не критично
      }
    }

    return NextResponse.json(data);
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

