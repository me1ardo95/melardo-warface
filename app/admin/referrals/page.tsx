import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/app/actions/data";
import type { Referral, Profile } from "@/lib/types";
type ReferralWithUsers = Referral & {
  referrer?: Pick<Profile, "id" | "warface_nick" | "display_name"> | null;
  referred?: Pick<Profile, "id" | "warface_nick" | "display_name"> | null;
};

async function getPendingReferrals(): Promise<ReferralWithUsers[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("referrals")
    .select(
      `
      id,
      referrer_user_id,
      referred_user_id,
      status,
      created_at,
      approved_at,
      admin_notes,
      referrer:profiles!referrals_referrer_user_id_fkey(id, warface_nick, display_name),
      referred:profiles!referrals_referred_user_id_fkey(id, warface_nick, display_name)
    `
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as ReferralWithUsers[];
}

async function updateReferral(id: string, action: "approve" | "reject") {
  "use server";
  const supabase = await createClient();

  const { data: referral } = await supabase
    .from("referrals")
    .select("id, referrer_user_id")
    .eq("id", id)
    .single();

  if (!referral) return;

  const delta = action === "approve" ? 7 : -7;

  const { error: rpcError } = await supabase.rpc("increment_profile_points", {
    p_profile_id: referral.referrer_user_id,
    p_delta: delta,
  });

  if (rpcError) {
    await supabase
      .from("profiles")
      .update({
        points: (supabase as any).sql`coalesce(points, 0) + ${delta}`,
      })
      .eq("id", referral.referrer_user_id);
  }

  await supabase
    .from("referrals")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      approved_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export default async function AdminReferralsPage() {
  const [profile, referrals] = await Promise.all([
    getCurrentProfile(),
    getPendingReferrals(),
  ]);
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Реферальные заявки
        </h1>
        {referrals.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Нет заявок в статусе &laquo;pending&raquo;.
          </p>
        ) : (
          <ul className="space-y-3">
            {referrals.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-neutral-500">Пригласивший: </span>
                    <span className="font-medium text-white">
                      {r.referrer?.warface_nick ??
                        r.referrer?.display_name ??
                        r.referrer_user_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Новый игрок: </span>
                    <span className="font-medium text-white">
                      {r.referred?.warface_nick ??
                        r.referred?.display_name ??
                        r.referred_user_id}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    Дата:{" "}
                    {new Date(r.created_at).toLocaleString("ru-RU")}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await updateReferral(r.id, "approve");
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      Подтвердить (+7 очков)
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await updateReferral(r.id, "reject");
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Отклонить как накрутку (-7)
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

