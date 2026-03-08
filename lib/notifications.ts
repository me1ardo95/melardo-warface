import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "./types";

/**
 * Простейшая обёртка для создания одного уведомления.
 * В большинстве случаев достаточно userId и типа.
 */
export async function sendNotification(
  userId: string | null,
  type: NotificationType,
  title: string,
  message: string,
  link: string
) {
  const supabase = await createClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    team_id: null,
    type,
    title,
    message,
    link,
  });

  if (error) {
    console.error("Failed to send notification", error.message);
  }
}

