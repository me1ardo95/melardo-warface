import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return apiError("Необходима авторизация", 401);

    if (!checkRateLimit(`complaint:${user.id}`)) {
      return apiError("Слишком много запросов. Попробуйте через минуту.", 429);
    }

    const body = await request.json().catch(() => ({}));
    const {
      subject,
      reason,
      description,
      proof_url,
      match_id,
      tournament_id,
      player_id,
      team_id,
    } = body as {
      subject?: string;
      reason?: string;
      description?: string;
      proof_url?: string;
      match_id?: string;
      tournament_id?: string;
      player_id?: string;
      team_id?: string;
    };

    const reasonText =
      (typeof subject === "string" && subject.trim()) ||
      (typeof reason === "string" && reason.trim()) ||
      "";
    if (!reasonText) return apiError("Укажите причину жалобы", 400);

    const { data, error } = await supabase
      .from("complaints")
      .insert({
        user_id: user.id,
        subject: reasonText,
        reason: typeof reason === "string" ? reason.trim() || null : null,
        description:
          description && typeof description === "string"
            ? description.trim() || null
            : null,
        proof_url:
          proof_url && typeof proof_url === "string"
            ? proof_url.trim() || null
            : null,
        match_id:
          match_id && typeof match_id === "string" ? match_id.trim() || null : null,
        tournament_id:
          tournament_id && typeof tournament_id === "string"
            ? tournament_id.trim() || null
            : null,
        player_id:
          player_id && typeof player_id === "string" ? player_id.trim() || null : null,
        team_id:
          team_id && typeof team_id === "string" ? team_id.trim() || null : null,
        status: "open",
      })
      .select("id, subject, status, created_at")
      .single();

    if (error) return apiError(error.message, 400);
    if (!data) return apiError("Не удалось создать жалобу", 500);

    return apiSuccess(data);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return apiError(msg, 500);
  }
}
