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

    if (!checkRateLimit(`tournament_register:${user.id}`)) {
      return apiError("Слишком много запросов. Попробуйте через минуту.", 429);
    }

    const body = await request.json().catch(() => ({}));
    const tournament_id =
      typeof body?.tournament_id === "string" ? body.tournament_id.trim() : "";
    const team_id =
      typeof body?.team_id === "string" ? body.team_id.trim() : "";

    if (!tournament_id)
      return apiError("Не указан турнир (tournament_id)", 400);
    if (!team_id) return apiError("Не указана команда (team_id)", 400);

    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", team_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member || member.role !== "captain") {
      return apiError("Только капитаны команд могут регистрировать команду", 403);
    }

    const { data: existing } = await supabase
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", tournament_id)
      .eq("team_id", team_id)
      .maybeSingle();

    if (existing) {
      return apiError("Команда уже зарегистрирована в этом турнире", 409);
    }

    const { data, error } = await supabase
      .from("tournament_registrations")
      .insert({ tournament_id, team_id })
      .select("id, tournament_id, team_id, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return apiError("Команда уже зарегистрирована в этом турнире", 409);
      }
      return apiError(error.message, 400);
    }

    return apiSuccess(data);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return apiError(msg, 500);
  }
}

