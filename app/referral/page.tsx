import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/app/actions/data";
import Link from "next/link";

function buildReferralLink(code: string | null) {
  if (!code) return "";
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://site.com"}/register?ref=${encodeURIComponent(code)}`;
}

export default async function ReferralPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Необходима авторизация.
        </p>
      </div>
    );
  }

  const { data: dbProfile } = await supabase
    .from("profiles")
    .select("id, invite_code")
    .eq("id", profile.id)
    .single();

  const inviteCode = (dbProfile as any)?.invite_code ?? null;
  const referralLink = buildReferralLink(inviteCode);

  const { data: referrals } = await supabase
    .from("referrals")
    .select(
      `
      id,
      referred_user_id,
      created_at,
      referred:profiles!referrals_referred_user_id_fkey(id, warface_nick, display_name)
    `
    )
    .eq("referrer_user_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen p-6">
      <nav className="mb-6 flex items-center gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <Link
          href="/"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Главная
        </Link>
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          Рефералы
        </span>
      </nav>

      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Реферальная программа
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Приглашайте друзей и получайте бонусы за регистрацию по вашему коду.
          </p>

          <div className="mt-4 space-y-3 text-sm">
            <div>
              <div className="text-neutral-500 dark:text-neutral-400">Ваш invite code</div>
              <div className="mt-1 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-lg font-semibold tracking-[0.2em] dark:border-neutral-700 dark:bg-neutral-800 dark:text-white">
                {inviteCode ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-neutral-500 dark:text-neutral-400">Ссылка для приглашения</div>
              <div className="mt-1 flex gap-2">
                <input
                  readOnly
                  value={referralLink || "Код ещё не сгенерирован"}
                  className="flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!referralLink) return;
                    await navigator.clipboard.writeText(referralLink);
                    alert("Ссылка скопирована в буфер обмена");
                  }}
                  className="whitespace-nowrap rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Скопировать
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Приглашённые игроки
          </h2>
          {!(referrals?.length ?? 0) ? (
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Вы ещё не пригласили ни одного игрока.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {referrals!.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-700"
                >
                  <span className="text-neutral-900 dark:text-neutral-100">
                    {(r as any).referred?.warface_nick ??
                      (r as any).referred?.display_name ??
                      (r as any).referred_user_id}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {new Date(r.created_at as string).toLocaleString("ru-RU")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

