import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { enqueueTelegramNotification } from "@/lib/telegram-queue";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return apiError("Необходима авторизация", 401);

    const body = await request.json().catch(() => ({}));
    const { clan_id, user_id } = body as { clan_id?: string; user_id?: string };
    if (!clan_id || !user_id) return apiError("Укажите clan_id и user_id", 400);

    const { data: myMember } = await supabase
      .from("clan_members")
      .select("role")
      .eq("clan_id", clan_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!myMember || !["owner", "captain"].includes(myMember.role)) {
      return apiError("Только владелец и капитаны могут приглашать", 403);
    }

    const { data: targetMember } = await supabase
      .from("clan_members")
      .select("id")
      .eq("user_id", user_id)
      .maybeSingle();
    if (targetMember) return apiError("Игрок уже в клане", 400);

    const { data: clan } = await supabase.from("clans").select("name, tag").eq("id", clan_id).single();
    if (!clan) return apiError("Клан не найден", 404);

    const { data: existing } = await supabase
      .from("clan_invites")
      .select("id, status")
      .eq("clan_id", clan_id)
      .eq("user_id", user_id)
      .maybeSingle();
    if (existing) {
      if (existing.status === "pending") return apiError("Приглашение уже отправлено", 400);
      await supabase
        .from("clan_invites")
        .update({ status: "pending", invited_by: user.id })
        .eq("id", existing.id);
    } else {
      await supabase.from("clan_invites").insert({
        clan_id,
        user_id,
        invited_by: user.id,
        status: "pending",
      });
    }

    void enqueueTelegramNotification(user_id, "clan_invited", {
      clan_name: clan.name,
      clan_tag: clan.tag,
      inviter_id: user.id,
    });

    return apiSuccess({ ok: true });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Ошибка", 500);
  }
}
