/**
 * Обновление рейтинга кланов после завершения матча.
 * Вызывается, когда match completed и обе команды привязаны к кланам.
 */

import { createServiceClient } from "@/lib/supabase/service";

const K = 32;

export async function updateClanRatingOnMatchComplete(
  matchId: string,
  team1Id: string,
  team2Id: string,
  score1: number,
  score2: number
): Promise<void> {
  const supabase = createServiceClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, clan_id")
    .in("id", [team1Id, team2Id]);
  const t1 = teams?.find((t) => t.id === team1Id);
  const t2 = teams?.find((t) => t.id === team2Id);
  const clan1Id = t1?.clan_id;
  const clan2Id = t2?.clan_id;
  if (!clan1Id || !clan2Id || clan1Id === clan2Id) return;

  const { data: c1 } = await supabase.from("clans").select("rating").eq("id", clan1Id).single();
  const { data: c2 } = await supabase.from("clans").select("rating").eq("id", clan2Id).single();
  if (!c1 || !c2) return;

  const r1 = c1.rating ?? 1000;
  const r2 = c2.rating ?? 1000;
  const e1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400));
  const e2 = 1 - e1;
  const s1 = score1 > score2 ? 1 : score1 < score2 ? 0 : 0.5;
  const s2 = 1 - s1;
  const delta1 = Math.round(K * (s1 - e1));
  const delta2 = Math.round(K * (s2 - e2));
  const new1 = Math.max(0, r1 + delta1);
  const new2 = Math.max(0, r2 + delta2);

  await supabase.from("clans").update({ rating: new1 }).eq("id", clan1Id);
  await supabase.from("clans").update({ rating: new2 }).eq("id", clan2Id);
  await supabase.from("clan_rating_history").insert([
    { clan_id: clan1Id, old_rating: r1, new_rating: new1, match_id: matchId },
    { clan_id: clan2Id, old_rating: r2, new_rating: new2, match_id: matchId },
  ]);
  await supabase.from("clan_matches").insert({
    clan1_id: clan1Id,
    clan2_id: clan2Id,
    match_id: matchId,
  });
}
