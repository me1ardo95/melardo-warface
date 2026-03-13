import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // dev
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === cronSecret;
}

function startOfDayUtc(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  );
}

function addDaysUtc(d: Date, days: number) {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function setTimeUtc(d: Date, hour: number, minute: number) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, minute, 0, 0)
  );
}

function getEnvInt(name: string, fallback: number) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

function getNextWeeklyDateUtc(from: Date, targetWeekday: number): Date {
  // 0=Sun..6=Sat
  const base = startOfDayUtc(from);
  const current = base.getUTCDay();
  const delta = (targetWeekday - current + 7) % 7;
  const next = addDaysUtc(base, delta === 0 ? 7 : delta);
  return next;
}

function getNextMonthlyDateUtc(from: Date, dayOfMonth: number): Date {
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth();
  const candidate = new Date(Date.UTC(y, m, dayOfMonth, 0, 0, 0, 0));
  if (candidate > from) return candidate;
  return new Date(Date.UTC(y, m + 1, dayOfMonth, 0, 0, 0, 0));
}

async function ensureScheduledTournament(opts: {
  title: string;
  start_time: Date;
  max_teams: number;
  entry_fee: number;
}) {
  const supabase = createServiceClient();
  const startIso = opts.start_time.toISOString();

  const { data: existing } = await supabase
    .from("scheduled_tournaments")
    .select("id")
    .eq("title", opts.title)
    .eq("start_time", startIso)
    .limit(1)
    .maybeSingle();

  if (existing) return { created: false, id: existing.id as string };

  const { data: created, error } = await supabase
    .from("scheduled_tournaments")
    .insert({
      title: opts.title,
      start_time: startIso,
      max_teams: opts.max_teams,
      entry_fee: opts.entry_fee,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error || !created) {
    return { created: false, error: error?.message ?? "insert failed" };
  }
  return { created: true, id: created.id as string };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    const hourUtc = getEnvInt("TOURNAMENT_START_HOUR_UTC", 18);
    const minuteUtc = getEnvInt("TOURNAMENT_START_MINUTE_UTC", 0);
    const maxTeams = getEnvInt("TOURNAMENT_MAX_TEAMS_DEFAULT", 16);
    const entryFee = getEnvInt("TOURNAMENT_ENTRY_FEE_DEFAULT", 0);

    const weeklyWeekday = getEnvInt("TOURNAMENT_WEEKLY_WEEKDAY_UTC", 6); // default: Saturday
    const monthlyDay = getEnvInt("TOURNAMENT_MONTHLY_DAY_UTC", 1); // default: 1st

    const tomorrow = addDaysUtc(startOfDayUtc(now), 1);
    const nextDaily = setTimeUtc(tomorrow, hourUtc, minuteUtc);
    const nextWeekly = setTimeUtc(
      getNextWeeklyDateUtc(now, weeklyWeekday),
      hourUtc,
      minuteUtc
    );
    const nextMonthly = setTimeUtc(
      getNextMonthlyDateUtc(now, monthlyDay),
      hourUtc,
      minuteUtc
    );

    const results = await Promise.all([
      ensureScheduledTournament({
        title: "Daily Cup",
        start_time: nextDaily,
        max_teams: maxTeams,
        entry_fee: entryFee,
      }),
      ensureScheduledTournament({
        title: "Weekly Cup",
        start_time: nextWeekly,
        max_teams: maxTeams,
        entry_fee: entryFee,
      }),
      ensureScheduledTournament({
        title: "Monthly Championship",
        start_time: nextMonthly,
        max_teams: maxTeams,
        entry_fee: entryFee,
      }),
    ]);

    const created = results.filter((r) => (r as any).created).length;
    return NextResponse.json({ ok: true, created, results });
  } catch (err) {
    console.error("[cron/tournament-generator]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

