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
    const { invitationId, status } = body as {
      invitationId?: string;
      status?: string;
    };

    if (!invitationId || typeof invitationId !== "string" || !invitationId.trim()) {
      return NextResponse.json(
        { error: "Укажите приглашение" },
        { status: 400 }
      );
    }
    if (status !== "accepted" && status !== "declined") {
      return NextResponse.json(
        { error: "Укажите действие: accepted или declined" },
        { status: 400 }
      );
    }

    const { data: invitation, error: fetchError } = await supabase
      .from("team_invitations")
      .select("id, team_id, user_id, status")
      .eq("id", invitationId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: "Приглашение не найдено или уже обработано" },
        { status: 404 }
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Приглашение уже обработано" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("team_invitations")
      .update({ status })
      .eq("id", invitationId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    if (status === "accepted") {
      const { error: memberError } = await supabase.from("team_members").insert({
        team_id: invitation.team_id,
        user_id: user.id,
        role: "member",
      });

      if (memberError) {
        if (memberError.code === "23505") {
          return NextResponse.json(
            { success: false, error: "Вы уже состоите в другой команде. Покиньте её, чтобы вступить в новую." },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: memberError.message },
          { status: 400 }
        );
      }
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
