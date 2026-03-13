import { NextResponse } from "next/server";
import {
  generateDailyMissions,
  generateWeeklyMissions,
  generateSeasonalMissions,
} from "@/lib/missions";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === cronSecret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [daily, weekly, seasonal] = await Promise.all([
      generateDailyMissions(),
      generateWeeklyMissions(),
      generateSeasonalMissions(),
    ]);

    return NextResponse.json({
      ok: true,
      daily_created: daily,
      weekly_created: weekly,
      seasonal_created: seasonal,
    });
  } catch (err) {
    console.error("[cron/mission-generator]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

