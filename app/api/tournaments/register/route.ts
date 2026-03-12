import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { enqueueTelegramNotification } from "@/lib/telegram-queue";

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

    const { data: tournament } = await supabase
      .from("tournaments")
      .select("id, status, max_teams, current_teams, type")
      .eq("id", tournamentId)
      .maybeSingle();
    if (!tournament) return apiError("Турнир не найден", 404);
    const status = String((tournament as any).status ?? "");
    if (!["upcoming", "registration"].includes(status)) {
      return apiError("Регистрация в этот турнир закрыта", 400);
    }

    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member || member.role !== "captain") {
      return apiError("Только капитаны команд могут регистрировать команду", 403);
    }

    const [{ data: teamRow }, { data: existing }] = await Promise.all([
      supabase.from("teams").select("id, clan_id, name").eq("id", teamId).maybeSingle(),
      supabase
        .from("tournament_teams")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("team_id", teamId)
        .maybeSingle(),
    ]);
    if (!teamRow) return apiError("Команда не найдена", 404);

    const type = (tournament as any).type as string | null;
    if (type === "clan" && !(teamRow as any).clan_id) {
      return apiError("Этот турнир только для клановых команд", 400);
    }

    if (existing) {
      return apiError("Команда уже зарегистрирована в этом турнире", 409);
    }

    const maxTeams = (tournament as any).max_teams as number | null;
    const currentTeams = (tournament as any).current_teams as number | null;
    if (typeof maxTeams === "number") {
      const current = typeof currentTeams === "number" ? currentTeams : 0;
      if (current >= maxTeams) {
        return apiError("В турнире больше нет свободных мест", 409);
      }
    }

    const { error: insertError } = await supabase
      .from("tournament_teams")
      .insert({ tournament_id: tournamentId, team_id: teamId });

    if (insertError) {
      if (insertError.code === "23505") {
        return apiError("Команда уже зарегистрирована в этом турнире", 409);
      }
      return apiError(insertError.message, 400);
    }

    try {
      await supabase
        .from("tournament_registrations")
        .insert({ tournament_id: tournamentId, team_id: teamId });
    } catch {
      // legacy insert не критичен (совместимость)
    }

    await supabase
      .from("tournaments")
      .update({
        current_teams: ((tournament as any).current_teams ?? 0) + 1,
      })
      .eq("id", tournamentId);

    try {
      const { data: captains } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId)
        .eq("role", "captain");
      (captains ?? []).forEach((c) => {
        void enqueueTelegramNotification(c.user_id as string, "tournament_registered", {
          tournament_id: tournamentId,
          team_id: teamId,
          team_name: (teamRow as any).name ?? null,
        });
      });
    } catch {
      // уведомления не критичны
    }

    return apiSuccess({ success: true });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return apiError(msg, 500);
  }
}

