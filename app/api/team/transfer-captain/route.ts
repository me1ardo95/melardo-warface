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
    const newCaptainUserId = body?.new_captain_user_id as string | undefined;
    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json(
        { error: "Укажите команду" },
        { status: 400 }
      );
    }
    if (!newCaptainUserId || typeof newCaptainUserId !== "string") {
      return NextResponse.json(
        { error: "Укажите участника для передачи капитанства" },
        { status: 400 }
      );
    }

    const { data: currentCaptain } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .eq("role", "captain")
      .single();

    if (!currentCaptain) {
      return NextResponse.json(
        { error: "Только капитан может передать капитанство" },
        { status: 403 }
      );
    }

    if (newCaptainUserId === user.id) {
      return NextResponse.json(
        { error: "Вы уже являетесь капитаном" },
        { status: 400 }
      );
    }

    const { data: newCaptainMember } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("user_id", newCaptainUserId)
      .single();

    if (!newCaptainMember) {
      return NextResponse.json(
        { error: "Указанный пользователь не входит в команду" },
        { status: 400 }
      );
    }

    await supabase
      .from("team_members")
      .update({ role: "member" })
      .eq("team_id", teamId)
      .eq("user_id", user.id);

    const { error: updateError } = await supabase
      .from("team_members")
      .update({ role: "captain" })
      .eq("team_id", teamId)
      .eq("user_id", newCaptainUserId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
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
