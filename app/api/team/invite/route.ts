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

    const body = await request.json();
    const { teamId, userNick } = body as { teamId?: string; userNick?: string };

    if (!teamId || typeof teamId !== "string" || !teamId.trim()) {
      return NextResponse.json(
        { error: "Укажите команду" },
        { status: 400 }
      );
    }
    if (!userNick || typeof userNick !== "string" || !userNick.trim()) {
      return NextResponse.json(
        { error: "Укажите ник игрока" },
        { status: 400 }
      );
    }

    const nick = userNick.trim();

    const { data: captain } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!captain || captain.role !== "captain") {
      return NextResponse.json(
        { error: "Только капитан может приглашать игроков" },
        { status: 403 }
      );
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .ilike("warface_nick", nick)
      .limit(1);

    const profile = profiles?.[0];

    if (!profile) {
      return NextResponse.json(
        { error: "Пользователь с таким ником не найден" },
        { status: 404 }
      );
    }

    const invitedUserId = profile.id;
    if (invitedUserId === user.id) {
      return NextResponse.json(
        { error: "Нельзя пригласить самого себя" },
        { status: 400 }
      );
    }

    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", invitedUserId)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: "Игрок уже в команде" },
        { status: 400 }
      );
    }

    const { data: existingInvite } = await supabase
      .from("team_invitations")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", invitedUserId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json(
        { error: "Приглашение этому игроку уже отправлено" },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from("team_invitations")
      .insert({
        team_id: teamId,
        user_id: invitedUserId,
        status: "pending",
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    try {
      const [{ data: captainProfile }, { data: team }] = await Promise.all([
        supabase
          .from("profiles")
          .select("warface_nick, display_name")
          .eq("id", user.id)
          .single(),
        supabase.from("teams").select("name").eq("id", teamId).single(),
      ]);

      const captainName =
        captainProfile?.warface_nick ??
        captainProfile?.display_name ??
        "капитан";
      const teamName = team?.name ?? "команда";

      await sendNotification(
        invitedUserId as string,
        "invite",
        "Приглашение в команду",
        `Капитан ${captainName} приглашает вас в команду ${teamName}.`,
        "/profile"
      );
    } catch {
      // уведомление необязательно
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
