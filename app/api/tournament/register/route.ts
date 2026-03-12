import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { MIN_RANK_TOURNAMENT } from "@/lib/warface";
import { enqueueTelegramNotification } from "@/lib/telegram-queue";

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("rank")
      .eq("id", user.id)
      .single();
    const rank = profile?.rank ?? 1;
    if (rank < MIN_RANK_TOURNAMENT) {
      return apiError(
        `Минимальный ранг для участия в турнирах: ${MIN_RANK_TOURNAMENT}. Ваш ранг: ${rank}.`,
        403
      );
    }

    const body = await request.json().catch(() => ({}));
    const tournament_id =
      typeof body?.tournament_id === "string" ? body.tournament_id.trim() : "";
    const team_id =
      typeof body?.team_id === "string" ? body.team_id.trim() : "";

    if (!tournament_id)
      return apiError("Не указан турнир (tournament_id)", 400);
    if (!team_id) return apiError("Не указана команда (team_id)", 400);

    const { data: tournament } = await supabase
      .from("tournaments")
      .select("id, status, max_teams, current_teams, type")
      .eq("id", tournament_id)
      .maybeSingle();
    if (!tournament) return apiError("Турнир не найден", 404);

    const status = String((tournament as any).status ?? "");
    if (!["upcoming", "registration"].includes(status)) {
      return apiError("Регистрация в этот турнир закрыта", 400);
    }

    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", team_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member || member.role !== "captain") {
      return apiError("Только капитаны команд могут регистрировать команду", 403);
    }

    const [{ data: teamRow }, { data: existing }] = await Promise.all([
      supabase.from("teams").select("id, clan_id, name").eq("id", team_id).maybeSingle(),
      supabase
        .from("tournament_teams")
        .select("id")
        .eq("tournament_id", tournament_id)
        .eq("team_id", team_id)
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

    // Пишем и в новую таблицу, и в legacy registrations (для совместимости страниц/админки).
    const { data, error } = await supabase
      .from("tournament_teams")
      .insert({ tournament_id, team_id })
      .select("id, tournament_id, team_id, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return apiError("Команда уже зарегистрирована в этом турнире", 409);
      }
      return apiError(error.message, 400);
    }

    try {
      await supabase.from("tournament_registrations").insert({ tournament_id, team_id });
    } catch {
      // legacy insert не критичен (совместимость)
    }

    await supabase
      .from("tournaments")
      .update({
        current_teams: ((tournament as any).current_teams ?? 0) + 1,
      })
      .eq("id", tournament_id);

    // Telegram: tournament_registration for captains
    try {
      const { data: captains } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", team_id)
        .eq("role", "captain");
      (captains ?? []).forEach((c) => {
        void enqueueTelegramNotification(c.user_id as string, "tournament_registered", {
          tournament_id,
          team_id,
          team_name: (teamRow as any).name ?? null,
        });
      });
    } catch {
      // уведомления не критичны
    }

    return apiSuccess(data);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return apiError(msg, 500);
  }
}

