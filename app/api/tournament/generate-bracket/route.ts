import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { generateBracket } from "@/lib/bracket";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return apiError("Необходима авторизация", 401);

    const body = await request.json().catch(() => ({}));
    const tournamentId =
      typeof body?.tournamentId === "string" ? body.tournamentId.trim() : "";

    if (!tournamentId) return apiError("Не указан турнир", 400);

    const result = await generateBracket(supabase, tournamentId);
    if (!result.ok) return apiError(result.error ?? "Не удалось сгенерировать сетку", 400);
    return apiSuccess({ success: true });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return apiError(msg, 500);
  }
}

