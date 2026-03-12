import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateBracket } from "@/lib/bracket";
import { enqueueTelegramNotification } from "@/lib/telegram-queue";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // если нет CRON_SECRET — пропускаем (dev)
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === cronSecret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const in2h = new Date(now.getTime() + TWO_HOURS_MS);
    const in5min = new Date(now.getTime() + FIVE_MINUTES_MS);

    const { data: scheduledList } = await supabase
      .from("scheduled_tournaments")
      .select("id, title, start_time, max_teams, tournament_id, status")
      .in("status", ["scheduled", "registration"])
      .lte("start_time", in2h.toISOString());

    if (!scheduledList?.length) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let processed = 0;

    for (const st of scheduledList) {
      const startTime = new Date(st.start_time);

      // 1) scheduled → registration (2h before)
      if (st.status === "scheduled" && startTime <= in2h) {
        let tournamentId = st.tournament_id;

        if (!tournamentId) {
          const { data: t, error: createErr } = await supabase
            .from("tournaments")
            .insert({
              name: st.title,
              game: "5x5",
              format: "single_elimination",
              max_teams: st.max_teams,
              start_date: st.start_time,
              status: "registration",
              type:
                st.title === "Weekly Cup"
                  ? "weekly"
                  : st.title === "Monthly Championship"
                    ? "monthly"
                    : "daily",
            })
            .select("id")
            .single();

          if (createErr || !t) continue;
          tournamentId = t.id;
          await supabase
            .from("scheduled_tournaments")
            .update({ tournament_id: tournamentId })
            .eq("id", st.id);
        }

        await supabase
          .from("scheduled_tournaments")
          .update({ status: "registration" })
          .eq("id", st.id);
        processed++;
      }

      // 2) registration → generate bracket (full or 5min before)
      if (st.status === "registration" && st.tournament_id) {
        const { count } = await supabase
          .from("tournament_teams")
          .select("id", { count: "exact", head: true })
          .eq("tournament_id", st.tournament_id);

        const registered = count ?? 0;
        const shouldGenerate =
          registered >= st.max_teams || startTime <= in5min;

        if (shouldGenerate && registered >= 2) {
          const result = await generateBracket(supabase, st.tournament_id);
          if (result.ok) processed++;
        }
      }
    }

    // 3) At start_time: scheduled_tournament → running
    const { data: toStart } = await supabase
      .from("scheduled_tournaments")
      .select("id, tournament_id")
      .in("status", ["scheduled", "registration"])
      .lte("start_time", now.toISOString());

    for (const st of toStart ?? []) {
      await supabase
        .from("scheduled_tournaments")
        .update({ status: "running" })
        .eq("id", st.id);
      if (st.tournament_id) {
        await supabase
          .from("tournaments")
          .update({ status: "active" })
          .eq("id", st.tournament_id)
          .in("status", ["upcoming", "registration"]);

        // Telegram: start for captains of registered teams
        try {
          const { data: teams } = await supabase
            .from("tournament_teams")
            .select("team_id")
            .eq("tournament_id", st.tournament_id)
            .eq("status", "active");
          const teamIds = [...new Set((teams ?? []).map((t) => t.team_id as string).filter(Boolean))];
          if (teamIds.length) {
            const { data: captains } = await supabase
              .from("team_members")
              .select("user_id")
              .in("team_id", teamIds)
              .eq("role", "captain");
            (captains ?? []).forEach((c) => {
              void enqueueTelegramNotification(c.user_id as string, "tournament_started", {
                tournament_id: st.tournament_id,
              });
            });
          }
        } catch {
          // уведомления не критичны
        }
      }
      processed++;
    }

    // 4) Match 30-min timeout: create dispute if first confirmation > 30 min ago and match not completed
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const { data: oldConfirmations } = await supabase
      .from("match_confirmations")
      .select("match_id")
      .lt("created_at", thirtyMinAgo.toISOString());

    const matchIdsWithOldConf = [...new Set((oldConfirmations ?? []).map((c) => c.match_id))];
    const matchIdsNeedingDispute = new Set<string>();
    for (const mid of matchIdsWithOldConf) {
      const { data: match } = await supabase
        .from("matches")
        .select("id, status")
        .eq("id", mid)
        .single();
      if (match && ["scheduled", "live"].includes(match.status ?? "")) {
        matchIdsNeedingDispute.add(mid);
      }
    }

    for (const mid of matchIdsNeedingDispute) {
      const { data: existing } = await supabase
        .from("match_disputes")
        .select("id")
        .eq("match_id", mid)
        .limit(1)
        .maybeSingle();
      if (!existing) {
        await supabase.from("match_disputes").insert({
          match_id: mid,
          reported_by_team_id: null,
          reason: "Матч не подтверждён в течение 30 минут",
          status: "open",
        });
        await supabase.from("matches").update({ status: "disputed" }).eq("id", mid);
        processed++;

        // Telegram: match_dispute_created for captains and admin alert
        try {
          const { data: matchTeams } = await supabase
            .from("matches")
            .select("team1_id, team2_id")
            .eq("id", mid)
            .single();
          const teamIds: string[] = [];
          if (matchTeams?.team1_id) teamIds.push(matchTeams.team1_id as string);
          if (matchTeams?.team2_id) teamIds.push(matchTeams.team2_id as string);

          if (teamIds.length) {
            const { data: captains } = await supabase
              .from("team_members")
              .select("user_id")
              .in("team_id", teamIds)
              .eq("role", "captain");
            (captains ?? []).forEach((c) => {
              void enqueueTelegramNotification(c.user_id as string, "match_dispute_created", {
                match_id: mid,
                reason: "Матч не подтверждён в течение 30 минут",
              });
            });
          }

          void enqueueTelegramNotification(null, "admin_alert_dispute", {
            match_id: mid,
            players: null,
            link: `/matches/${mid}`,
          });
        } catch {
          // уведомления не критичны
        }
      }
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error("[cron/tournament-tick]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
