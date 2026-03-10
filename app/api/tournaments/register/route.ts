import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

type RegisterBody = {
  tournament_id?: string;
  team_id?: string;
};

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

    const rawBody = (await request.json().catch(() => ({}))) as RegisterBody;
    const tournamentId =
      typeof rawBody.tournament_id === "string" &&
      rawBody.tournament_id.trim()
        ? rawBody.tournament_id.trim()
        : "";
    const teamId =
      typeof rawBody.team_id === "string" && rawBody.team_id.trim()
        ? rawBody.team_id.trim()
        : "";

    if (!tournamentId) return apiError("Не указан турнир (tournament_id)", 400);
    if (!teamId) return apiError("Не указана команда (team_id)", 400);

    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member || member.role !== "captain") {
      return apiError("Только капитаны команд могут регистрировать команду", 403);
    }

    const { data: existing } = await supabase
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("team_id", teamId)
      .maybeSingle();

    if (existing) {
      return apiError("Команда уже зарегистрирована в этом турнире", 409);
    }

    const { error: insertError } = await supabase
      .from("tournament_registrations")
      .insert({ tournament_id: tournamentId, team_id: teamId });

    if (insertError) {
      if (insertError.code === "23505") {
        return apiError("Команда уже зарегистрирована в этом турнире", 409);
      }
      return apiError(insertError.message, 400);
    }

    return apiSuccess({ success: true });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return apiError(msg, 500);
  }
}

