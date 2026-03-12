import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return apiError("Необходима авторизация", 401);

    const body = await request.json().catch(() => ({}));
    const { invite_id, action } = body as { invite_id?: string; action?: "accept" | "decline" };
    if (!invite_id || !action || !["accept", "decline"].includes(action)) {
      return apiError("Укажите invite_id и action (accept/decline)", 400);
    }

    const { data: invite } = await supabase
      .from("clan_invites")
      .select("id, clan_id, user_id, status")
      .eq("id", invite_id)
      .single();
    if (!invite) return apiError("Приглашение не найдено", 404);
    if (invite.user_id !== user.id) return apiError("Это не ваше приглашение", 403);
    if (invite.status !== "pending") return apiError("Приглашение уже обработано", 400);

    if (action === "decline") {
      await supabase
        .from("clan_invites")
        .update({ status: "declined" })
        .eq("id", invite_id);
      return apiSuccess({ ok: true, accepted: false });
    }

    const { data: existing } = await supabase
      .from("clan_members")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) return apiError("Вы уже в клане", 400);

    await supabase.from("clan_invites").update({ status: "accepted" }).eq("id", invite_id);
    const { error } = await supabase.from("clan_members").insert({
      clan_id: invite.clan_id,
      user_id: user.id,
      role: "member",
    });
    if (error) {
      await supabase.from("clan_invites").update({ status: "pending" }).eq("id", invite_id);
      return apiError(error.message, 400);
    }
    return apiSuccess({ ok: true, accepted: true });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Ошибка", 500);
  }
}
