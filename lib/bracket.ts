import type { SupabaseClient } from "@supabase/supabase-js";
import { generateSecretPhrase, WARFACE_MAPS } from "@/lib/warface";

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

export type BracketData = {
  type: "single_elimination";
  rounds: BracketRound[];
};

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function isPowerOfTwo(n: number) {
  return n > 0 && (n & (n - 1)) === 0;
}

export async function generateBracket(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: tournamentRow } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournamentRow) return { ok: false, error: "Турнир не найден" };

  const tournament = tournamentRow as {
    status: string;
    max_teams?: number | null;
    bracket_data?: BracketData | null;
    start_date?: string | null;
    start_time?: string | null;
    game?: string | null;
  };

  if (!["upcoming", "registration"].includes(tournament.status)) {
    return { ok: false, error: "Турнир не в статусе регистрации" };
  }
  if (tournament.bracket_data) {
    return { ok: true }; // уже сгенерировано
  }

  const { data: registrations } = await supabase
    .from("tournament_teams")
    .select("team_id, teams(id, name)")
    .eq("tournament_id", tournamentId)
    .eq("status", "active");

  type RegRow = {
    team_id?: string;
    teams?: { id: string; name: string } | { id: string; name: string }[] | null;
  };
  const teams: BracketTeam[] = (registrations ?? [])
    .map((r: RegRow) => {
      const t = r.teams;
      const team = Array.isArray(t) ? t[0] : t;
      return team ? { id: team.id, name: team.name } : null;
    })
    .filter((t): t is BracketTeam => !!t);

  const teamCount = teams.length;
  if (teamCount < 2) return { ok: false, error: "Нужно минимум 2 команды" };
  if (!isPowerOfTwo(teamCount)) return { ok: false, error: "Нужна степень двойки" };

  const shuffledTeams = shuffle(teams);
  const totalRounds = Math.log2(teamCount);

  const firstRoundMatchesMeta: { team1: BracketTeam; team2: BracketTeam }[] = [];

  for (let i = 0; i < teamCount; i += 2) {
    const team1 = shuffledTeams[i];
    const team2 = shuffledTeams[i + 1];
    if (!team1 || !team2) continue;
    firstRoundMatchesMeta.push({ team1, team2 });
  }

  // Проставляем seed по порядку после random seeding (1..N)
  try {
    for (let i = 0; i < shuffledTeams.length; i++) {
      const t = shuffledTeams[i];
      if (!t) continue;
      await supabase
        .from("tournament_teams")
        .update({ seed: i + 1 })
        .eq("tournament_id", tournamentId)
        .eq("team_id", t.id);
    }
  } catch {
    // seed не критичен
  }

  const when = tournament.start_time ?? tournament.start_date ?? null;
  const teamSize = tournament.game ?? "5x5";

  function roundLabel(matchesInRound: number, roundIndex: number): string {
    if (matchesInRound === 1) return "final";
    if (matchesInRound === 2) return "semi_final";
    return String(roundIndex + 1);
  }

  // 1) Создаём строки сетки для всех раундов (матчи следующих раундов будут создаваться по мере появления пар)
  const bracketRows: {
    tournament_id: string;
    round: string;
    match_number: number;
    team1_id: string | null;
    team2_id: string | null;
    match_id: string | null;
  }[] = [];

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const matchesInRound = teamCount / Math.pow(2, roundIndex + 1);
    const label = roundLabel(matchesInRound, roundIndex);
    for (let m = 0; m < matchesInRound; m++) {
      if (roundIndex === 0) {
        const meta = firstRoundMatchesMeta[m];
        bracketRows.push({
          tournament_id: tournamentId,
          round: label,
          match_number: m + 1,
          team1_id: meta?.team1?.id ?? null,
          team2_id: meta?.team2?.id ?? null,
          match_id: null,
        });
      } else {
        bracketRows.push({
          tournament_id: tournamentId,
          round: label,
          match_number: m + 1,
          team1_id: null,
          team2_id: null,
          match_id: null,
        });
      }
    }
  }

  const { data: insertedBrackets, error: bracketErr } = await supabase
    .from("tournament_brackets")
    .insert(bracketRows)
    .select("id, round, match_number, team1_id, team2_id");

  if (bracketErr || !insertedBrackets?.length) {
    return { ok: false, error: bracketErr?.message ?? "Не удалось создать сетку" };
  }

  // 2) Создаём матчи только для первого раунда (когда пары известны)
  const round1 = insertedBrackets
    .filter((b: any) => b.team1_id && b.team2_id)
    .sort((a: any, b: any) => (a.match_number ?? 0) - (b.match_number ?? 0));
  const createdMatchIds: string[] = [];

  for (const b of round1 as any[]) {
    let matchIdNumeric: number;
    try {
      const { data: raw } = await supabase.rpc("get_next_match_id_numeric").single();
      matchIdNumeric =
        typeof raw === "number" ? raw : Math.floor(10000 + Math.random() * 90000);
    } catch {
      matchIdNumeric = Math.floor(10000 + Math.random() * 90000);
    }

    const lobbyCode = `WF-${matchIdNumeric}`;
    const secretPhrase = generateSecretPhrase();
    const map = WARFACE_MAPS[Math.floor(Math.random() * WARFACE_MAPS.length)];

    const { data: match, error: matchErr } = await supabase
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        team1_id: b.team1_id,
        team2_id: b.team2_id,
        creator_team_id: b.team1_id,
        status: "awaiting_result",
        score_team1: 0,
        score_team2: 0,
        scheduled_at: when,
        match_id_numeric: matchIdNumeric,
        lobby_code: lobbyCode,
        secret_phrase: secretPhrase,
        map,
        team_size: teamSize,
        format: "BO1",
        rounds: "6 раундов, овертайм включен",
      })
      .select("id")
      .single();

    if (matchErr || !match) {
      return { ok: false, error: matchErr?.message ?? "Не удалось создать матч" };
    }

    createdMatchIds.push(match.id as string);

    await supabase
      .from("tournament_brackets")
      .update({ match_id: match.id })
      .eq("id", b.id);
  }

  const rounds: BracketRound[] = [];
  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const roundNumber = roundIndex + 1;
    const matchesInRound = teamCount / Math.pow(2, roundNumber);
    const matches: BracketMatch[] = [];

    for (let pos = 0; pos < matchesInRound; pos++) {
      if (roundNumber === 1) {
        const meta = firstRoundMatchesMeta[pos];
        matches.push({
          id: `r${roundNumber}-m${pos + 1}`,
          match_id: createdMatchIds[pos] ?? null,
          round: roundNumber,
          position: pos + 1,
          team1: meta?.team1 ?? null,
          team2: meta?.team2 ?? null,
        });
      } else {
        matches.push({
          id: `r${roundNumber}-m${pos + 1}`,
          match_id: null,
          round: roundNumber,
          position: pos + 1,
          team1: null,
          team2: null,
        });
      }
    }
    rounds.push({ round: roundNumber, matches });
  }

  const bracketData: BracketData = { type: "single_elimination", rounds };

  // next_match_id будет выставляться при создании матчей следующих раундов (автопрогресс).

  const { error: updateError } = await supabase
    .from("tournaments")
    .update({
      status: "active",
      bracket_data: bracketData as unknown as Record<string, unknown>,
    })
    .eq("id", tournamentId);

  if (updateError) return { ok: false, error: updateError.message };
  return { ok: true };
}
