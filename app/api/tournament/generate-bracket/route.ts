import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import type { Tournament } from "@/lib/types";

type BracketTeam = { id: string; name: string };

type BracketMatch = {
  id: string;
  match_id: string | null;
  round: number;
  position: number;
  team1: BracketTeam | null;
  team2: BracketTeam | null;
};

type BracketRound = {
  round: number;
  matches: BracketMatch[];
};

type BracketData = {
  type: "single_elimination";
  rounds: BracketRound[];
};

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function isPowerOfTwo(n: number) {
  return n > 0 && (n & (n - 1)) === 0;
}

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

    const { data: tournamentRow, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournamentRow) {
      return apiError("Турнир не найден", 404);
    }

    const tournament = tournamentRow as Tournament & {
      max_teams?: number | null;
      bracket_data?: BracketData | null;
    };

    if (tournament.status !== "upcoming") {
      return apiError(
        "Сетку можно генерировать только для турниров в статусе «Регистрация»",
        400
      );
    }

    if (tournament.bracket_data) {
      return apiError("Сетка уже сгенерирована для этого турнира", 400);
    }

    const { data: registrations, error: regsError } = await supabase
      .from("tournament_registrations")
      .select("team_id, teams(id, name)")
      .eq("tournament_id", tournamentId);

    if (regsError) return apiError(regsError.message, 400);

    type RegRow = {
      team_id?: string;
      teams?: { id: string; name: string } | { id: string; name: string }[] | null;
    };
    const teams: BracketTeam[] =
      (registrations ?? [])
        .map((r: RegRow) => {
          const t = r.teams;
          const team = Array.isArray(t) ? t[0] : t;
          return team ? { id: team.id, name: team.name } : null;
        })
        .filter((t): t is BracketTeam => !!t);

    const teamCount = teams.length;

    if (teamCount < 2) {
      return apiError("Для генерации сетки нужно минимум две команды", 400);
    }

    if (tournament.max_teams && teamCount !== tournament.max_teams) {
      return apiError(
        `Количество команд (${teamCount}) должно совпадать с лимитом турнира (${tournament.max_teams})`,
        400
      );
    }

    if (!isPowerOfTwo(teamCount)) {
      return apiError(
        "Для формата Single Elimination нужно 2, 4, 8, 16 или 32 команды (степень двойки). Зарегистрируйте нужное количество команд.",
        400
      );
    }

    const shuffledTeams = shuffle(teams);
    const totalRounds = Math.log2(teamCount);

    // —— Создаём матчи первого раунда ——
    const firstRoundPayload = [];
    const firstRoundMatchesMeta: {
      team1: BracketTeam;
      team2: BracketTeam;
    }[] = [];

    for (let i = 0; i < teamCount; i += 2) {
      const team1 = shuffledTeams[i];
      const team2 = shuffledTeams[i + 1];
      firstRoundMatchesMeta.push({ team1, team2 });
      firstRoundPayload.push({
        tournament_id: tournamentId,
        team1_id: team1.id,
        team2_id: team2.id,
        status: "scheduled",
        score_team1: 0,
        score_team2: 0,
        scheduled_at: tournament.start_date ?? null,
      });
    }

    const { data: createdMatches, error: insertError } = await supabase
      .from("matches")
      .insert(firstRoundPayload)
      .select("id");

    if (insertError || !createdMatches) {
      return apiError(
        insertError?.message ?? "Не удалось создать матчи первого раунда",
        400
      );
    }

    const firstRoundIds = (createdMatches ?? []).map((m: { id: string }) => m.id);

    // Create play-off matches for rounds 2+ (semifinals, finals, etc.)
    const allMatchIdsByRound: (string | null)[][] = [firstRoundIds];

    for (let roundIndex = 1; roundIndex < totalRounds; roundIndex++) {
      const matchesInRound = teamCount / Math.pow(2, roundIndex + 1);
      const playOffPayload = Array.from({ length: matchesInRound }, () => ({
        tournament_id: tournamentId,
        team1_id: null,
        team2_id: null,
        status: "scheduled",
        score_team1: 0,
        score_team2: 0,
        scheduled_at: tournament.start_date ?? null,
      }));

      const { data: playOffMatches, error: playOffError } = await supabase
        .from("matches")
        .insert(playOffPayload)
        .select("id");

      if (playOffError || !playOffMatches) {
        return apiError(
          playOffError?.message ?? "Не удалось создать матчи плей-офф",
          400
        );
      }

      allMatchIdsByRound.push(
        (playOffMatches ?? []).map((m: { id: string }) => m.id)
      );
    }

    const rounds: BracketRound[] = [];

    for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
      const roundNumber = roundIndex + 1;
      const matchesInRound = teamCount / Math.pow(2, roundNumber);
      const roundMatchIds = allMatchIdsByRound[roundIndex] ?? [];

      const matches: BracketMatch[] = [];

      for (let pos = 0; pos < matchesInRound; pos++) {
        if (roundNumber === 1) {
          const meta = firstRoundMatchesMeta[pos];
          matches.push({
            id: `r${roundNumber}-m${pos + 1}`,
            match_id: roundMatchIds[pos] ?? null,
            round: roundNumber,
            position: pos + 1,
            team1: meta.team1,
            team2: meta.team2,
          });
        } else {
          matches.push({
            id: `r${roundNumber}-m${pos + 1}`,
            match_id: roundMatchIds[pos] ?? null,
            round: roundNumber,
            position: pos + 1,
            team1: null,
            team2: null,
          });
        }
      }

      rounds.push({ round: roundNumber, matches });
    }

    const bracketData: BracketData = {
      type: "single_elimination",
      rounds,
    };

    // Связываем матчи между раундами через next_match_id в таблице matches.
    // Для каждого матча в раунде r указываем матч в раунде r+1, в который
    // переходит победитель (две соседние сетки в раунде ведут в одну игру
    // следующего раунда).
    for (let roundIndex = 0; roundIndex < totalRounds - 1; roundIndex++) {
      const currentRoundIds = allMatchIdsByRound[roundIndex] ?? [];
      const nextRoundIds = allMatchIdsByRound[roundIndex + 1] ?? [];

      for (let i = 0; i < currentRoundIds.length; i++) {
        const fromMatchId = currentRoundIds[i];
        const toMatchId = nextRoundIds[Math.floor(i / 2)];
        if (!fromMatchId || !toMatchId) continue;

        await supabase
          .from("matches")
          .update({ next_match_id: toMatchId })
          .eq("id", fromMatchId);
      }
    }

    const { error: updateError } = await supabase
      .from("tournaments")
      .update({
        status: "ongoing",
        bracket_data: bracketData as unknown as Record<string, unknown>,
      })
      .eq("id", tournamentId);

    if (updateError) return apiError(updateError.message, 400);

    return apiSuccess(bracketData);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return apiError(msg, 500);
  }
}

