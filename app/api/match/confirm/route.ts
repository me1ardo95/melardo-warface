import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications";
import { apiError, apiSuccess } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { logSystemError } from "@/lib/system-log";
import { normalizeSecretPhrase } from "@/lib/warface";
import { updateTrustScoreOnMatchComplete, updateTrustScoreOnDispute } from "@/app/actions/trust-score";
import { enqueueTelegramNotification } from "@/lib/telegram-queue";
import { updateMissionProgressOnMatchComplete } from "@/lib/missions";
import { updateClanRatingOnMatchComplete } from "@/lib/clan-rating";
import { onTournamentMatchCompleted } from "@/lib/tournament-flow";

const BUCKET = "match-screenshots";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const TEAM_POINTS_PER_MATCH_WIN = 10;
const PLAYER_POINTS_PER_MATCH_WIN = 5;
const TEAM_POINTS_PER_TOURNAMENT_WIN = 25;
const PLAYER_POINTS_PER_TOURNAMENT_WIN = 10;

async function isFinalTournamentMatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string
): Promise<boolean> {
  const { data: bracket } = await supabase
    .from("tournament_brackets")
    .select("round")
    .eq("match_id", matchId)
    .limit(1)
    .maybeSingle();
  if (bracket) {
    return String((bracket as any).round ?? "") === "final";
  }
  const { data } = await supabase
    .from("matches")
    .select("next_match_id")
    .eq("id", matchId)
    .single();
  return data?.next_match_id === null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return apiError("Необходима авторизация", 401);
    }

    if (!checkRateLimit(`match_confirm:${user.id}`)) {
      return apiError(
        "Слишком много запросов. Попробуйте через минуту.",
        429
      );
    }

    const formData = await request.formData();
    const matchId = String(formData.get("match_id") || "").trim();
    const score1 = Number(formData.get("score_team1"));
    const score2 = Number(formData.get("score_team2"));
    const agree = formData.get("agree") === "on";
    const screenshot = formData.get("screenshot");
    const secretPhraseRaw = String(formData.get("secret_phrase") || "").trim();

    if (!matchId) return apiError("Не указан матч", 400);
    if (!Number.isFinite(score1) || !Number.isFinite(score2)) {
      return apiError("Укажите счёт обеих команд", 400);
    }
    if (score1 < 0 || score2 < 0 || score1 > 100 || score2 > 100) {
      return apiError("Счёт должен быть от 0 до 100", 400);
    }
    if (!agree) {
      return apiError(
        "Необходимо подтвердить, что скриншот соответствует реальному результату",
        400
      );
    }
    if (
      !(screenshot instanceof File) ||
      !ALLOWED_TYPES.includes(screenshot.type as (typeof ALLOWED_TYPES)[number])
    ) {
      return apiError(
        "Загрузите скриншот в формате PNG, JPEG или WebP",
        400
      );
    }
    if (screenshot.size > MAX_FILE_SIZE) {
      return apiError("Размер файла не должен превышать 5 МБ", 400);
    }

    const { data: match } = await supabase
      .from("matches")
      .select("id, team1_id, team2_id, status, tournament_id, points_awarded, secret_phrase, map")
      .eq("id", matchId)
      .single();

    if (!match) return apiError("Матч не найден", 404);

    const storedSecretPhrase = (match as { secret_phrase?: string | null }).secret_phrase;
    if (storedSecretPhrase) {
      if (!secretPhraseRaw) {
        return apiError("Укажите Secret Phrase из матча", 400);
      }
      if (normalizeSecretPhrase(secretPhraseRaw) !== normalizeSecretPhrase(storedSecretPhrase)) {
        return apiError("Secret Phrase указана неверно", 400);
      }
    }

    if (["completed", "cancelled", "disputed"].includes(match.status)) {
      return apiError(
        "Матч уже завершён или находится на рассмотрении",
        400
      );
    }

    if (match.points_awarded) {
      return apiError("Очки за этот матч уже начислены", 400);
    }

    const team1Id = match.team1_id as string | null;
    const team2Id = match.team2_id as string | null;
    const tournamentId = match.tournament_id as string | null;

    if (!team1Id || !team2Id) {
      return apiError("В матче должны быть две команды", 400);
    }
    if (team1Id === team2Id) {
      return apiError("Команды не могут совпадать", 400);
    }

    const { data: team1 } = await supabase
      .from("teams")
      .select("id")
      .eq("id", team1Id)
      .single();
    const { data: team2 } = await supabase
      .from("teams")
      .select("id")
      .eq("id", team2Id)
      .single();
    if (!team1 || !team2) {
      return apiError("Одна или обе команды не найдены", 404);
    }

    if (tournamentId) {
      const { data: regs } = await supabase
        .from("tournament_registrations")
        .select("team_id")
        .eq("tournament_id", tournamentId)
        .in("team_id", [team1Id, team2Id]);
      const regTeamIds = new Set((regs ?? []).map((r) => r.team_id));
      if (!regTeamIds.has(team1Id) || !regTeamIds.has(team2Id)) {
        return apiError(
          "Обе команды должны быть зарегистрированы в турнире",
          400
        );
      }
    }

    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id, role")
      .in("team_id", [team1Id, team2Id])
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || membership.role !== "captain") {
      return apiError(
        "Только капитаны команд могут подтверждать результат",
        403
      );
    }

    const { data: bucketData, error: bucketError } = await supabase.storage
      .getBucket(BUCKET);

    if (bucketError || !bucketData) {
      await logSystemError("storage_bucket_missing", `Bucket "${BUCKET}" недоступен`, {
        error: bucketError?.message,
      });
      return apiError(
        `Хранилище скриншотов недоступно. Обратитесь к администратору.`,
        503
      );
    }

    const ext =
      screenshot.type === "image/png"
        ? "png"
        : screenshot.type === "image/webp"
          ? "webp"
          : "jpg";
    const filePath = `${matchId}/${membership.team_id}-${Date.now()}.${ext}`;

    const arrayBuffer = await screenshot.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, Buffer.from(arrayBuffer), {
        contentType: screenshot.type,
        upsert: false,
      });

    if (uploadError) {
      await logSystemError("storage_upload_failed", "Ошибка загрузки скриншота", {
        matchId,
        filePath,
        error: uploadError.message,
      });
      return apiError(
        `Ошибка загрузки скриншота: ${uploadError.message}`,
        400
      );
    }

    const screenshotUrl = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath).data.publicUrl;

    const insertPayload: Record<string, unknown> = {
      match_id: matchId,
      captain_id: user.id,
      team_id: membership.team_id,
      score_team1: score1,
      score_team2: score2,
      screenshot_url: screenshotUrl,
      status: "pending",
    };
    if (storedSecretPhrase) {
      insertPayload.secret_phrase = secretPhraseRaw ? normalizeSecretPhrase(secretPhraseRaw) : null;
    }

    const { error: insertError } = await supabase
      .from("match_confirmations")
      .upsert(insertPayload, { onConflict: "match_id,captain_id" });

    if (insertError) {
      return apiError(insertError.message, 400);
    }

    // Telegram: match_result_submitted for current captain
    void enqueueTelegramNotification(user.id, "match_result_submitted", {
      match_id: matchId,
      score_team1: score1,
      score_team2: score2,
    });

    const { data: confirmations } = await supabase
      .from("match_confirmations")
      .select("id, team_id, score_team1, score_team2, status, screenshot_url, secret_phrase")
      .eq("match_id", matchId);

    const confirmationList = confirmations ?? [];
    if (confirmationList.length >= 2) {
      const c1 = confirmationList[0];
      const c2 = confirmationList[1];
      if (!c1 || !c2) {
        return apiError("Ошибка при проверке подтверждений", 500);
      }
      const c1Sp = (c1 as { secret_phrase?: string | null }).secret_phrase;
      const c2Sp = (c2 as { secret_phrase?: string | null }).secret_phrase;
      const storedSp = storedSecretPhrase;
      const sameSecretPhrase =
        !storedSp || (c1Sp && c2Sp && normalizeSecretPhrase(c1Sp) === normalizeSecretPhrase(storedSp) && normalizeSecretPhrase(c2Sp) === normalizeSecretPhrase(storedSp));
      const sameScore =
        c1.score_team1 === c2.score_team1 && c1.score_team2 === c2.score_team2;
      const bothHaveScreenshot = !!c1.screenshot_url && !!c2.screenshot_url;

      if (sameScore && sameSecretPhrase && bothHaveScreenshot) {
        await supabase
          .from("match_confirmations")
          .update({ status: "confirmed" })
          .eq("match_id", matchId);

        const { data: confWithScreenshot } = await supabase
          .from("match_confirmations")
          .select("screenshot_url")
          .eq("match_id", matchId)
          .limit(1)
          .maybeSingle();

        const screenshotUrl = confWithScreenshot?.screenshot_url ?? null;

        const { data: updatedMatch, error: matchUpdateError } = await supabase
          .from("matches")
          .update({
            status: "completed",
            score_team1: c1.score_team1,
            score_team2: c1.score_team2,
            completed_at: new Date().toISOString(),
            points_awarded: true,
            screenshot_url: screenshotUrl,
          })
          .eq("id", matchId)
          .eq("points_awarded", false)
          .select("id, team1_id, team2_id, status, tournament_id, points_awarded")
          .maybeSingle();

        if (!matchUpdateError && updatedMatch) {
          const winnerId =
            c1.score_team1 > c1.score_team2
              ? updatedMatch.team1_id
              : updatedMatch.team2_id;

          if (winnerId) {
            const isFinal = await isFinalTournamentMatch(supabase, matchId);

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
              .update({ points: newTeamPoints })
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
                .update({ points: newPlayerPoints })
                .eq("id", m.user_id);

              await supabase.from("profile_points_history").insert({
                profile_id: m.user_id,
                delta: playerDelta,
                comment: isFinal
                  ? `Победа в финальном матче турнира (${matchId})`
                  : `Победа в матче турнира (${matchId})`,
              });
            }

            if (tournamentId) {
              await onTournamentMatchCompleted({
                supabase,
                matchId,
                tournamentId,
                winnerTeamId: winnerId,
              });
            }

            const { data: allMembers } = await supabase
              .from("team_members")
              .select("user_id")
              .in("team_id", [updatedMatch.team1_id, updatedMatch.team2_id]);
            const participantIds = [...new Set((allMembers ?? []).map((m) => m.user_id as string))];
            void updateMissionProgressOnMatchComplete(participantIds, {
              team1_id: updatedMatch.team1_id!,
              team2_id: updatedMatch.team2_id!,
              score_team1: c1.score_team1,
              score_team2: c1.score_team2,
              map: (match as { map?: string | null }).map ?? null,
              winner_team_id: winnerId,
            });

            void updateClanRatingOnMatchComplete(
              matchId,
              updatedMatch.team1_id!,
              updatedMatch.team2_id!,
              c1.score_team1,
              c1.score_team2
            );
          }
        }

        try {
          const { data: captainsData } = await supabase
            .from("team_members")
            .select("team_id, user_id")
            .in("team_id", [team1Id, team2Id])
            .eq("role", "captain");

          const captainUserIds = (captainsData ?? []).map((c) => c.user_id as string);
          void updateTrustScoreOnMatchComplete(captainUserIds, matchId);

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

          // Telegram: match_confirmed + match_finished for captains
          (captainsData ?? []).forEach((c) => {
            const uid = c.user_id as string;
            const payload = {
              match_id: matchId,
              score_team1: c1.score_team1,
              score_team2: c1.score_team2,
            };
            void enqueueTelegramNotification(uid, "match_confirmed", payload);
            void enqueueTelegramNotification(uid, "match_finished", payload);
          });
        } catch {
          // уведомления не критичны
        }

        return apiSuccess({
          success: true,
          resolved: true,
          status: "completed",
        });
      }

      const disputeReason =
        !sameSecretPhrase
          ? "Secret Phrase указана неверно"
          : !bothHaveScreenshot
            ? "Отсутствует скриншот результата"
            : "Несовпадение счёта при подтверждении командами";

      await supabase
        .from("match_confirmations")
        .update({ status: "disputed" })
        .eq("match_id", matchId);

      await supabase.from("match_disputes").insert({
        match_id: matchId,
        reported_by_team_id: null,
        reason: disputeReason,
        status: "open",
      });

      await supabase.from("matches").update({ status: "disputed" }).eq("id", matchId);

      const { data: disputeCaptains } = await supabase
        .from("team_members")
        .select("user_id")
        .in("team_id", [team1Id, team2Id])
        .eq("role", "captain");
      const disputeCaptainIds = (disputeCaptains ?? []).map((c) => c.user_id as string);
      void updateTrustScoreOnDispute(disputeCaptainIds);

      // Telegram: match_dispute_created for captains and admin alert
      (disputeCaptains ?? []).forEach((c) => {
        void enqueueTelegramNotification(c.user_id as string, "match_dispute_created", {
          match_id: matchId,
          reason: disputeReason,
        });
      });
      void enqueueTelegramNotification(null, "admin_alert_dispute", {
        match_id: matchId,
        players: null,
        link: `/matches/${matchId}`,
      });

      return apiSuccess({
        success: true,
        resolved: false,
        status: "disputed",
      });
    }

    return apiSuccess({
      success: true,
      resolved: false,
      status: match.status,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return apiError(message, 500);
  }
}
