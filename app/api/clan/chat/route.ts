import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clanId = searchParams.get("clan_id");
    if (!clanId) return apiError("Укажите clan_id", 400);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return apiError("Необходима авторизация", 401);

    const { data: member } = await supabase
      .from("clan_members")
      .select("id")
      .eq("clan_id", clanId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) return apiError("Вы не в этом клане", 403);

    const { data } = await supabase
      .from("clan_messages")
      .select(`
        id, message, created_at,
        profile:profiles(id, warface_nick, display_name)
      `)
      .eq("clan_id", clanId)
      .order("created_at", { ascending: true })
      .limit(100);
    return NextResponse.json({ messages: data ?? [] });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Ошибка", 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return apiError("Необходима авторизация", 401);

    const body = await request.json().catch(() => ({}));
    const { clan_id, message } = body as { clan_id?: string; message?: string };
    if (!clan_id || typeof message !== "string") return apiError("Укажите clan_id и message", 400);
    const trimmed = message.trim();
    if (!trimmed || trimmed.length > 2000) return apiError("Сообщение: 1–2000 символов", 400);

    const { data: member } = await supabase
      .from("clan_members")
      .select("id")
      .eq("clan_id", clan_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) return apiError("Вы не в этом клане", 403);

    const { error } = await supabase.from("clan_messages").insert({
      clan_id,
      user_id: user.id,
      message: trimmed,
    });
    if (error) return apiError(error.message, 400);
    return apiSuccess({ ok: true });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Ошибка", 500);
  }
}
