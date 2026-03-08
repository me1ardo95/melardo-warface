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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Доступ запрещён" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { match_id, score_team1, score_team2 } = body as {
      match_id?: string;
      score_team1?: number;
      score_team2?: number;
    };

    if (!match_id || typeof match_id !== "string") {
      return NextResponse.json(
        { error: "Не указан идентификатор матча" },
        { status: 400 }
      );
    }

    const s1 = Number(score_team1);
    const s2 = Number(score_team2);
    if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 < 0 || s2 < 0) {
      return NextResponse.json(
        { error: "Укажите корректный счёт" },
        { status: 400 }
      );
    }

    const { data: match } = await supabase
      .from("matches")
      .select("id, team1_id, team2_id, status")
      .eq("id", match_id)
      .single();

    if (!match || match.status !== "disputed") {
      return NextResponse.json(
        { error: "Матч не найден или не в статусе оспаривается" },
        { status: 400 }
      );
    }

    await supabase
      .from("match_confirmations")
      .update({ status: "confirmed" })
      .eq("match_id", match_id);

    await supabase
      .from("matches")
      .update({
        status: "completed",
        score_team1: s1,
        score_team2: s2,
        completed_at: new Date().toISOString(),
      })
      .eq("id", match_id);

    const winnerId = s1 > s2 ? match.team1_id : match.team2_id;
    const POINTS_PER_WIN = 3;

    if (winnerId) {
      const { data: teamRow } = await supabase
        .from("teams")
        .select("points")
        .eq("id", winnerId)
        .single();
      await supabase
        .from("teams")
        .update({
          points: (teamRow?.points ?? 0) + POINTS_PER_WIN,
        })
        .eq("id", winnerId);

      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", winnerId);
      for (const m of members ?? []) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("points")
          .eq("id", m.user_id)
          .single();
        await supabase
          .from("profiles")
          .update({
            points: (prof?.points ?? 0) + POINTS_PER_WIN,
          })
          .eq("id", m.user_id);
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
