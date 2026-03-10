import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications";

type BracketMatch = {
  id: string;
  match_id: string | null;
  round: number;
  position: number;
  team1?: { id: string; name: string } | null;
  team2?: { id: string; name: string } | null;
};

type BracketRound = {
  round: number;
  matches: BracketMatch[];
};

type BracketData = {
  rounds: BracketRound[];
};

const TEAM_POINTS_PER_MATCH_WIN = 10;
const PLAYER_POINTS_PER_MATCH_WIN = 5;
const TEAM_POINTS_PER_TOURNAMENT_WIN = 25;
  const PLAYER_POINTS_PER_TOURNAMENT_WIN = 10;

async function isFinalTournamentMatch(
  supabase: ReturnType<typeof createClient> extends Promise<infer C> ? C : never,
  tournamentId: string | null,
  matchId: string
): Promise<boolean> {
  if (!tournamentId) return false;

  const { data } = await supabase
    .from("tournaments")
    .select("bracket_data")
    .eq("id", tournamentId)
    .single();

  const bracket = (data?.bracket_data ?? null) as BracketData | null;
  if (!bracket || !Array.isArray(bracket.rounds) || bracket.rounds.length === 0) {
    return false;
  }

  const lastRound = bracket.rounds[bracket.rounds.length - 1];
  if (!lastRound || !Array.isArray(lastRound.matches)) return false;

  return lastRound.matches.some((m) => m.match_id === matchId);
}

async function progressBracketWinner(
  supabase: ReturnType<typeof createClient> extends Promise<infer C> ? C : never,
  tournamentId: string | null,
  matchId: string,
  winnerTeamId: string | null
): Promise<void> {
  if (!tournamentId || !winnerTeamId) return;

  const { data } = await supabase
    .from("tournaments")
    .select("bracket_data, status")
    .eq("id", tournamentId)
    .single();

  const bracket = (data?.bracket_data ?? null) as BracketData | null;
  if (!bracket || !Array.isArray(bracket.rounds) || bracket.rounds.length === 0) {
    return;
  }

  const rounds = bracket.rounds;
  let currentRoundIndex = -1;
  let currentMatchIndex = -1;

  for (let r = 0; r < rounds.length; r++) {
    const round = rounds[r];
    for (let m = 0; m < round.matches.length; m++) {
      if (round.matches[m].match_id === matchId) {
        currentRoundIndex = r;
        currentMatchIndex = m;
        break;
      }
    }
    if (currentRoundIndex !== -1) break;
  }

  if (currentRoundIndex === -1 || currentMatchIndex === -1) {
    return;
  }

  const isLastRound = currentRoundIndex === rounds.length - 1;
  if (isLastRound) {
    if (data?.status !== "completed") {
      await supabase
        .from("tournaments")
        .update({
          status: "completed",
          winner_team_id: winnerTeamId,
        })
        .eq("id", tournamentId);
    }
    return;
  }

  const nextRoundIndex = currentRoundIndex + 1;
  const nextRound = rounds[nextRoundIndex];
  if (!nextRound) return;

  const nextMatchIndex = Math.floor(currentMatchIndex / 2);
  const nextMatch = nextRound.matches[nextMatchIndex];
  if (!nextMatch || !nextMatch.match_id) return;

  const winnerGoesToTeam1 = currentMatchIndex % 2 === 0;
  const nextMatchId = nextMatch.match_id;

  if (winnerGoesToTeam1) {
    const { data: nextMatchRow } = await supabase
      .from("matches")
      .select("team1_id")
      .eq("id", nextMatchId)
      .single();

    if (nextMatchRow?.team1_id) return;

    await supabase
      .from("matches")
      .update({ team1_id: winnerTeamId })
      .eq("id", nextMatchId)
      .is("team1_id", null);
  } else {
    const { data: nextMatchRow } = await supabase
      .from("matches")
      .select("team2_id")
      .eq("id", nextMatchId)
      .single();

    if (nextMatchRow?.team2_id) return;

    await supabase
      .from("matches")
      .update({ team2_id: winnerTeamId })
      .eq("id", nextMatchId)
      .is("team2_id", null);
  }
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

    const formData = await request.formData();
    const matchId = String(formData.get("match_id") || "").trim();
    const score1 = Number(formData.get("score_team1"));
    const score2 = Number(formData.get("score_team2"));
    const agree = formData.get("agree") === "on";
    const screenshot = formData.get("screenshot");

    if (!matchId) {
      return NextResponse.json(
        { error: "Не указан матч" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(score1) || !Number.isFinite(score2)) {
      return NextResponse.json(
        { error: "Укажите счёт обеих команд" },
        { status: 400 }
      );
    }
    if (!agree) {
      return NextResponse.json(
        {
          error:
            "Необходимо подтвердить, что скриншот соответствует реальному результату",
        },
        { status: 400 }
      );
    }
    if (
      !(screenshot instanceof File) ||
      !["image/jpeg", "image/png"].includes(screenshot.type)
    ) {
      return NextResponse.json(
        { error: "Загрузите скриншот в формате JPG или PNG" },
        { status: 400 }
      );
    }

    const { data: match } = await supabase
      .from("matches")
      .select("id, team1_id, team2_id, status, tournament_id, points_awarded")
      .eq("id", matchId)
      .single();

    if (!match) {
      return NextResponse.json(
        { error: "Матч не найден" },
        { status: 404 }
      );
    }

    if (["completed", "cancelled", "disputed"].includes(match.status)) {
      return NextResponse.json(
        { error: "Матч уже завершён или находится на рассмотрении" },
        { status: 400 }
      );
    }

    const teamIds = [match.team1_id, match.team2_id].filter(
      (id): id is string => !!id
    );

    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id, role")
      .in("team_id", teamIds)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || membership.role !== "captain") {
      return NextResponse.json(
        { error: "Только капитаны команд могут подтверждать результат" },
        { status: 403 }
      );
    }

    const ext =
      screenshot.type === "image/png"
        ? "png"
        : "jpg";
    const filePath = `${matchId}/${membership.team_id}-${Date.now()}.${ext}`;

    const arrayBuffer = await screenshot.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("match-screenshots")
      .upload(filePath, Buffer.from(arrayBuffer), {
        contentType: screenshot.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 400 }
      );
    }

    const screenshotUrl = supabase.storage
      .from("match-screenshots")
      .getPublicUrl(filePath).data.publicUrl;

    const { error: insertError } = await supabase
      .from("match_confirmations")
      .upsert(
        {
          match_id: matchId,
          captain_id: user.id,
          team_id: membership.team_id,
          score_team1: score1,
          score_team2: score2,
          screenshot_url: screenshotUrl,
          status: "pending",
        },
        {
          onConflict: "match_id,captain_id",
        }
      );

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    const { data: confirmations } = await supabase
      .from("match_confirmations")
      .select(
        "id, team_id, score_team1, score_team2, status"
      )
      .eq("match_id", matchId);

    const confirmationList = confirmations ?? [];
    if (confirmationList.length >= 2) {
      const c1 = confirmationList[0];
      const c2 = confirmationList[1];
      if (!c1 || !c2) {
        return NextResponse.json(
          { error: "Ошибка при проверке подтверждений" },
          { status: 500 }
        );
      }
      const sameScore =
        c1.score_team1 === c2.score_team1 &&
        c1.score_team2 === c2.score_team2;

      if (sameScore) {
        await supabase
          .from("match_confirmations")
          .update({ status: "confirmed" })
          .eq("match_id", matchId);

        const { data: updatedMatch, error: matchUpdateError } = await supabase
          .from("matches")
          .update({
            status: "completed",
            score_team1: c1.score_team1,
            score_team2: c1.score_team2,
            completed_at: new Date().toISOString(),
            points_awarded: true,
          })
          .eq("id", matchId)
          .is("points_awarded", false)
          .select("id, team1_id, team2_id, status, tournament_id, points_awarded")
          .single();

        if (!matchUpdateError && updatedMatch && updatedMatch.points_awarded) {
          const winnerId =
            c1.score_team1 > c1.score_team2 ? updatedMatch.team1_id : updatedMatch.team2_id;

          if (winnerId) {
            const isFinal = await isFinalTournamentMatch(
              supabase,
              updatedMatch.tournament_id ?? null,
              matchId
            );

            const teamDelta =
              TEAM_POINTS_PER_MATCH_WIN +
              (isFinal ? TEAM_POINTS_PER_TOURNAMENT_WIN : 0);
            const playerDelta =
              PLAYER_POINTS_PER_MATCH_WIN +
              (isFinal ? PLAYER_POINTS_PER_TOURNAMENT_WIN : 0);

            const { data: teamRow } = await supabase
              .from("teams")
              .select("points")
              .eq("id", winnerId)
              .single();

            const newTeamPoints = (teamRow?.points ?? 0) + teamDelta;

            await supabase
              .from("teams")
              .update({
                points: newTeamPoints,
              })
              .eq("id", winnerId);

            await supabase.from("team_points_history").insert({
              team_id: winnerId,
              delta: teamDelta,
              comment: isFinal
                ? `Победа в финальном матче турнира (${matchId})`
                : `Победа в матче турнира (${matchId})`,
            });

            const { data: members } = await supabase
              .from("team_members")
              .select("user_id")
              .eq("team_id", winnerId);

            for (const m of members ?? []) {
              const { data: prof } = await supabase
                .from("profiles")
                .select("points")
                .eq("id", m.user_id)
                .single();

              const newPlayerPoints = (prof?.points ?? 0) + playerDelta;

              await supabase
                .from("profiles")
                .update({
                  points: newPlayerPoints,
                })
                .eq("id", m.user_id);

              await supabase.from("profile_points_history").insert({
                profile_id: m.user_id,
                delta: playerDelta,
                comment: isFinal
                  ? `Победа в финальном матче турнира (${matchId})`
                  : `Победа в матче турнира (${matchId})`,
              });
            }

            await progressBracketWinner(
              supabase,
              updatedMatch.tournament_id ?? null,
              matchId,
              winnerId
            );
          }
        }

        try {
          const { data: captainsData } = await supabase
            .from("team_members")
            .select("team_id, user_id")
            .in("team_id", teamIds)
            .eq("role", "captain");

          const title = "Результат матча подтверждён";
          const message =
            "Результат матча подтверждён обеими командами. Очки будут начислены в рейтинге.";

          (captainsData ?? []).forEach((c) => {
            void sendNotification(
              c.user_id as string,
              "match_confirm",
              title,
              message,
              `/matches/${matchId}`
            );
          });
        } catch {
          // уведомления не критичны
        }

        return NextResponse.json({
          success: true,
          resolved: true,
          status: "completed",
        });
      }

      await supabase
        .from("match_confirmations")
        .update({ status: "disputed" })
        .eq("match_id", matchId);
      await supabase
        .from("matches")
        .update({ status: "disputed" })
        .eq("id", matchId);

      return NextResponse.json({
        success: true,
        resolved: false,
        status: "disputed",
      });
    }

    return NextResponse.json({
      success: true,
      resolved: false,
      status: match.status,
    });
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
