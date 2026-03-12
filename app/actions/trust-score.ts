"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  TRUST_SCORE_INITIAL,
  TRUST_DELTA,
  HONEST_STREAK_THRESHOLD,
  clampTrustScore,
} from "@/lib/trust-score";

export async function updateTrustScoreOnMatchComplete(
  captainUserIds: string[],
  matchId: string
): Promise<void> {
  const supabase = createServiceClient();
  for (const userId of captainUserIds) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("trust_score")
      .eq("id", userId)
      .single();
    const current = prof?.trust_score ?? TRUST_SCORE_INITIAL;
    const newScore = clampTrustScore(current + TRUST_DELTA.COMPLETED_NO_DISPUTE);

    await supabase.from("profiles").update({ trust_score: newScore }).eq("id", userId);
    await supabase.from("trust_score_history").insert({
      user_id: userId,
      delta: TRUST_DELTA.COMPLETED_NO_DISPUTE,
      reason: "completed_no_dispute",
      match_id: matchId,
    });

    const { count: completedCount } = await supabase
      .from("trust_score_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("reason", "completed_no_dispute");
    const total = completedCount ?? 0;
    const shouldGiveBonus = total > 0 && total % HONEST_STREAK_THRESHOLD === 0;

    if (shouldGiveBonus) {
      const { data: prof2 } = await supabase
        .from("profiles")
        .select("trust_score")
        .eq("id", userId)
        .single();
      const current2 = prof2?.trust_score ?? newScore;
      const bonusScore = clampTrustScore(current2 + TRUST_DELTA.HONEST_STREAK_10);
      await supabase.from("profiles").update({ trust_score: bonusScore }).eq("id", userId);
      await supabase.from("trust_score_history").insert({
        user_id: userId,
        delta: TRUST_DELTA.HONEST_STREAK_10,
        reason: "honest_streak_10",
        match_id: matchId,
      });
    }
  }
}

export async function updateTrustScoreOnDispute(
  captainUserIds: string[]
): Promise<void> {
  const supabase = createServiceClient();
  for (const userId of captainUserIds) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("trust_score")
      .eq("id", userId)
      .single();
    const current = prof?.trust_score ?? TRUST_SCORE_INITIAL;
    const newScore = clampTrustScore(current + TRUST_DELTA.DISPUTE);

    await supabase.from("profiles").update({ trust_score: newScore }).eq("id", userId);
    await supabase.from("trust_score_history").insert({
      user_id: userId,
      delta: TRUST_DELTA.DISPUTE,
      reason: "dispute",
    });
  }
}
