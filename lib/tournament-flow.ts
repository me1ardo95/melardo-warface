import type { SupabaseClient } from "@supabase/supabase-js";
import { generateSecretPhrase, WARFACE_MAPS } from "@/lib/warface";
import { enqueueTelegramNotification } from "@/lib/telegram-queue";
import { awardTournamentTop3Rewards } from "@/lib/tournament-rewards";

type BracketRow = {
  id: string;
  tournament_id: string;
  round: string;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  match_id: string | null;
  winner_team_id: string | null;
};

async function getMatchIdNumeric(supabase: SupabaseClient): Promise<number> {
  try {
    const { data: raw } = await supabase.rpc("get_next_match_id_numeric").single();
    if (typeof raw === "number") return raw;
  } catch {
    // ignore
  }
  return Math.floor(10000 + Math.random() * 90000);
}

async function getRoundSizes(supabase: SupabaseClient, tournamentId: string) {
  const { data } = await supabase
    .from("tournament_brackets")
    .select("round, match_number")
    .eq("tournament_id", tournamentId);

  const maxByRound = new Map<string, number>();
  (data ?? []).forEach((r: any) => {
    const round = String(r.round ?? "");
    const n = Number(r.match_number ?? 0);
    if (!round || !Number.isFinite(n)) return;
    maxByRound.set(round, Math.max(maxByRound.get(round) ?? 0, n));
  });
  return maxByRound;
}

function findRoundBySize(maxByRound: Map<string, number>, size: number): string | null {
  for (const [round, max] of maxByRound.entries()) {
    if (max === size) return round;
  }
  return null;
}

export async function onTournamentMatchCompleted(opts: {
  supabase: SupabaseClient;
  matchId: string;
  tournamentId: string;
  winnerTeamId: string;
}) {
  const { supabase, matchId, tournamentId, winnerTeamId } = opts;

  // 1) Найти строку сетки по match_id
  const { data: bracket } = await supabase
    .from("tournament_brackets")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("match_id", matchId)
    .maybeSingle();

  if (!bracket) return { ok: true, progressed: false as const };

  const b = bracket as unknown as BracketRow;

  // 2) Зафиксировать победителя
  await supabase
    .from("tournament_brackets")
    .update({ winner_team_id: winnerTeamId })
    .eq("id", b.id);

  // Telegram: победа в раунде (капитану)
  try {
    const { data: captains } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", winnerTeamId)
      .eq("role", "captain");
    (captains ?? []).forEach((c) => {
      void enqueueTelegramNotification(c.user_id as string, "tournament_round_won", {
        tournament_id: tournamentId,
        match_id: matchId,
        round: b.round,
      });
    });
  } catch {
    // уведомления не критичны
  }

  // 3) Понять следующий раунд (по размеру раундов)
  const maxByRound = await getRoundSizes(supabase, tournamentId);
  const currentSize = maxByRound.get(b.round) ?? 0;
  const nextSize = currentSize > 1 ? Math.floor(currentSize / 2) : 0;
  if (nextSize <= 0) {
    // финал завершён
    await supabase
      .from("tournaments")
      .update({ status: "finished", winner_team_id: winnerTeamId })
      .eq("id", tournamentId)
      .neq("status", "finished");

    // Награды топ-3
    try {
      await awardTournamentTop3Rewards({ supabase, tournamentId, winnerTeamId });
    } catch {
      // награды не должны ломать матч-флоу
    }

    // Telegram: победа в турнире
    try {
      const { data: captains } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", winnerTeamId)
        .eq("role", "captain");
      (captains ?? []).forEach((c) => {
        void enqueueTelegramNotification(c.user_id as string, "tournament_won", {
          tournament_id: tournamentId,
          match_id: matchId,
        });
      });
    } catch {
      // уведомления не критичны
    }
    return { ok: true, progressed: true as const, finished: true as const };
  }

  const nextRound = findRoundBySize(maxByRound, nextSize);
  if (!nextRound) return { ok: true, progressed: false as const };

  const nextMatchNumber = Math.ceil(b.match_number / 2);
  const slot = b.match_number % 2 === 1 ? "team1_id" : "team2_id";

  // 4) Заполнить слот в матче следующего раунда
  const { data: nextRow } = await supabase
    .from("tournament_brackets")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("round", nextRound)
    .eq("match_number", nextMatchNumber)
    .maybeSingle();

  if (!nextRow) return { ok: true, progressed: false as const };
  const nr = nextRow as unknown as BracketRow;

  if (slot === "team1_id" && nr.team1_id !== winnerTeamId) {
    await supabase
      .from("tournament_brackets")
      .update({ team1_id: winnerTeamId })
      .eq("id", nr.id);
    nr.team1_id = winnerTeamId;
  }
  if (slot === "team2_id" && nr.team2_id !== winnerTeamId) {
    await supabase
      .from("tournament_brackets")
      .update({ team2_id: winnerTeamId })
      .eq("id", nr.id);
    nr.team2_id = winnerTeamId;
  }

  // 5) Если теперь есть пара и match_id ещё нет — создать матч
  if (!nr.match_id && nr.team1_id && nr.team2_id) {
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("start_time, start_date, game")
      .eq("id", tournamentId)
      .maybeSingle();

    const when = (tournament as any)?.start_time ?? (tournament as any)?.start_date ?? null;
    const teamSize = (tournament as any)?.game ?? "5x5";

    const matchIdNumeric = await getMatchIdNumeric(supabase);
    const lobbyCode = `WF-${matchIdNumeric}`;
    const secretPhrase = generateSecretPhrase();
    const map = WARFACE_MAPS[Math.floor(Math.random() * WARFACE_MAPS.length)];

    const { data: createdMatch, error: createErr } = await supabase
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        team1_id: nr.team1_id,
        team2_id: nr.team2_id,
        creator_team_id: nr.team1_id,
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

    if (createErr || !createdMatch) {
      return { ok: false, error: createErr?.message ?? "Не удалось создать матч" };
    }

    await supabase
      .from("tournament_brackets")
      .update({ match_id: createdMatch.id })
      .eq("id", nr.id);

    await supabase
      .from("matches")
      .update({ next_match_id: createdMatch.id })
      .eq("id", matchId);

    // Telegram: tournament_match_created for captains of both teams
    try {
      const { data: captains } = await supabase
        .from("team_members")
        .select("user_id")
        .in("team_id", [nr.team1_id, nr.team2_id])
        .eq("role", "captain");

      (captains ?? []).forEach((c) => {
        void enqueueTelegramNotification(c.user_id as string, "tournament_match_created", {
          tournament_id: tournamentId,
          match_id: createdMatch.id,
          lobby_code: lobbyCode,
          secret_phrase: secretPhrase,
          round: nextRound,
        });
        void enqueueTelegramNotification(c.user_id as string, "match_result_confirmation_required", {
          match_id: createdMatch.id,
        });
      });
    } catch {
      // уведомления не критичны
    }
  } else {
    // уже есть матч/пара ещё не полная
    await supabase.from("matches").update({ next_match_id: nr.match_id }).eq("id", matchId);
  }

  return { ok: true, progressed: true as const, finished: false as const };
}

