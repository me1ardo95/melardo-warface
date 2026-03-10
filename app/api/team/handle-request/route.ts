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
    const requestId = (body?.request_id as string | undefined)?.trim();
    const teamId = (body?.team_id as string | undefined)?.trim();
    const action = body?.action as "approve" | "reject" | undefined;

    if (!requestId) {
      return NextResponse.json(
        { error: "Укажите заявку" },
        { status: 400 }
      );
    }
    if (!teamId) {
      return NextResponse.json(
        { error: "Укажите команду" },
        { status: 400 }
      );
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Неверное действие" },
        { status: 400 }
      );
    }

    const { data: captain } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!captain || captain.role !== "captain") {
      return NextResponse.json(
        { error: "Только капитан может обрабатывать заявки" },
        { status: 403 }
      );
    }

    const { data: joinRequest, error: fetchError } = await supabase
      .from("team_join_requests")
      .select("id, user_id, status, team_id")
      .eq("id", requestId)
      .single();

    if (fetchError || !joinRequest) {
      return NextResponse.json(
        { error: "Заявка не найдена" },
        { status: 404 }
      );
    }

    if (joinRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Заявка уже обработана" },
        { status: 400 }
      );
    }

    if (action === "reject") {
      const { error: updateError } = await supabase
        .from("team_join_requests")
        .update({ status: "rejected", team_id: teamId })
        .eq("id", requestId);
      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true });
    }

    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", joinRequest.user_id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: "Игрок уже в команде" },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase.from("team_members").insert({
      team_id: teamId,
      user_id: joinRequest.user_id,
      role: "member",
    });
    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Игрок уже состоит в другой команде" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("team_join_requests")
      .update({ status: "approved", team_id: teamId })
      .eq("id", requestId);
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

