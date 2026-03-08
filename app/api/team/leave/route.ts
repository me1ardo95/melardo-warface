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
    const teamId = (body?.team_id as string | undefined)?.trim();
    if (!teamId) {
      return NextResponse.json(
        { error: "Укажите команду" },
        { status: 400 }
      );
    }

    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .select("user_id, role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Вы не состоите в этой команде" },
        { status: 404 }
      );
    }

    const { data: allMembers } = await supabase
      .from("team_members")
      .select("user_id, role")
      .eq("team_id", teamId);

    const members = allMembers ?? [];

    if (member.role !== "captain") {
      await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", user.id);
      return NextResponse.json({ success: true });
    }

    if (members.length <= 1) {
      return NextResponse.json(
        {
          error:
            "Вы единственный игрок в команде и остаётесь капитаном. Сначала добавьте других игроков или удалите команду.",
        },
        { status: 400 }
      );
    }

    const otherUserIds = members
      .map((m) => m.user_id)
      .filter((id) => id !== user.id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, points")
      .in("id", otherUserIds);

    const candidates = profiles ?? [];
    if (!candidates.length) {
      return NextResponse.json(
        { error: "Не удалось определить нового капитана" },
        { status: 400 }
      );
    }

    const newCaptain = candidates.reduce((best, current) =>
      (current.points ?? 0) > (best.points ?? 0) ? current : best
    );

    await supabase
      .from("team_members")
      .update({ role: "captain" })
      .eq("team_id", teamId)
      .eq("user_id", newCaptain.id);

    await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, new_captain_id: newCaptain.id });
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

