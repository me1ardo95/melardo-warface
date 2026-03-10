import { createClient } from "@supabase/supabase-js";

/** Записать критическую ошибку в system_logs (через service role если доступен) */
export async function logSystemError(
  type: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const supabase = createClient(url, key);
    await supabase.from("system_logs").insert({
      type,
      message,
      data: data ?? {},
    });
  } catch {
    console.error("[system_log]", type, message, data);
  }
}
