import { createServiceClient } from "@/lib/supabase/service";
import { enqueueTelegramNotification } from "@/lib/telegram-queue";

export async function updateRankDivisionForUser(userId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: prof } = await supabase
    .from("profiles")
    .select("points, rank_division_id")
    .eq("id", userId)
    .single();
  if (!prof) return;

  const rating = (prof as any).points ?? 0;

  const { data: divisions } = await supabase
    .from("rank_divisions")
    .select("id, name, min_rating, max_rating")
    .order("min_rating", { ascending: true });
  if (!divisions?.length) return;

  const currentId = (prof as any).rank_division_id as string | null;

  const target = (divisions as any[]).find((d) => {
    const min = d.min_rating ?? 0;
    const max = d.max_rating as number | null;
    if (max == null) return rating >= min;
    return rating >= min && rating < max;
  });

  if (!target) return;
  if (currentId === target.id) return;

  await supabase
    .from("profiles")
    .update({ rank_division_id: target.id })
    .eq("id", userId);

  // Telegram: rank_up
  try {
    void enqueueTelegramNotification(userId, "rank_up", {
      division_name: target.name,
      rating,
    });
  } catch {
    // необязательно
  }
}

