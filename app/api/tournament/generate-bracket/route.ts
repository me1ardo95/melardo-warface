import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    if (!user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const tournamentId =
      typeof body?.tournamentId === "string" && body.tournamentId.trim()
        ? body.tournamentId.trim()
        : "";

    if (!tournamentId) {
      return NextResponse.json(
        { error: "Не указан турнир" },
        { status: 400 }
      );
    }

    const { data: tournamentRow, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournamentRow) {
      return NextResponse.json(
        { error: "Турнир не найден" },
        { status: 404 }
      );
    }

    const tournament = tournamentRow as Tournament & {
      max_teams?: number | null;
      bracket_data?: BracketData | null;
    };

    if (tournament.status !== "upcoming") {
      return NextResponse.json(
        { error: "Сетку можно генерировать только для турниров в статусе 'Регистрация'" },
        { status: 400 }
      );
    }

    if (tournament.bracket_data) {
      return NextResponse.json(
        { error: "Сетка уже сгенерирована для этого турнира" },
        { status: 400 }
      );
    }

    const { data: registrations, error: regsError } = await supabase
      .from("tournament_registrations")
      .select("team_id, teams(id, name)")
      .eq("tournament_id", tournamentId);

    if (regsError) {
      return NextResponse.json(
        { error: regsError.message },
        { status: 400 }
      );
    }

    const teams: BracketTeam[] =
      registrations
        ?.map((r: any) =>
          r.teams
            ? { id: r.teams.id as string, name: r.teams.name as string }
            : null
        )
        .filter((t: BracketTeam | null): t is BracketTeam => !!t) ?? [];

    const teamCount = teams.length;

    if (teamCount < 2) {
      return NextResponse.json(
        { error: "Для сетки нужно минимум две команды" },
        { status: 400 }
      );
    }

    if (tournament.max_teams && teamCount !== tournament.max_teams) {
      return NextResponse.json(
        {
          error: `Количество команд (${teamCount}) должно совпадать с ограничением турнира (${tournament.max_teams})`,
        },
        { status: 400 }
      );
    }

    if (!isPowerOfTwo(teamCount)) {
      return NextResponse.json(
        {
          error:
            "Для формата Single Elimination поддерживаются только 4, 8, 16, 32 и т.д. команд (степень двойки).",
        },
        { status: 400 }
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
      return NextResponse.json(
        {
          error:
            insertError?.message ??
            "Не удалось создать матчи первого раунда",
        },
        { status: 400 }
      );
    }

    const firstRoundIds = createdMatches.map((m: any) => m.id as string);

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
        return NextResponse.json(
          {
            error:
              playOffError?.message ?? "Не удалось создать матчи плей-офф",
          },
          { status: 400 }
        );
      }

      allMatchIdsByRound.push(
        playOffMatches.map((m: any) => m.id as string)
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

    const { error: updateError } = await supabase
      .from("tournaments")
      .update({
        status: "ongoing",
        bracket_data: bracketData as any,
      })
      .eq("id", tournamentId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(bracketData);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Внутренняя ошибка сервера",
      },
      { status: 500 }
    );
  }
}

