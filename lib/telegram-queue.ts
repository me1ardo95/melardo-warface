import { createServiceClient } from "@/lib/supabase/service";

export type TelegramNotificationType =
  | "match_created"
  | "match_accepted"
  | "match_started"
  | "match_result_confirmation_required"
  | "match_result_submitted"
  | "match_confirmed"
  | "match_finished"
  | "match_dispute_created"
  | "match_admin_resolved"
  | "quick_match_found"
  | "rank_up"
  | "trust_score_changed"
  | "smurf_flag_created"
  | "admin_alert_dispute"
  | "mission_completed"
  | "clan_invited"
  | "clan_war_started"
  | "clan_war_won"
  | "tournament_registered"
  | "tournament_started"
  | "tournament_match_created"
  | "tournament_round_won"
  | "tournament_won";

export async function enqueueTelegramNotification(
  userId: string | null,
  type: TelegramNotificationType,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("notification_queue").insert({
      user_id: userId,
      type,
      payload,
      status: "pending",
    });
    if (error) {
      console.error("[telegram-queue] Failed to enqueue notification", error.message);
    }
  } catch (err) {
    console.error(
      "[telegram-queue] Unexpected error while enqueuing notification",
      err instanceof Error ? err.message : err
    );
  }
}

