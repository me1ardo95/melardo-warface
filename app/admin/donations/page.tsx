import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/app/actions/data";
import type { Donation, Profile, Team } from "@/lib/types";
import { AdminNav } from "../AdminNav";

type DonationWithRelations = Donation & {
  user?: Pick<Profile, "id" | "warface_nick" | "display_name"> | null;
  team?: Pick<Team, "id" | "name"> | null;
};

async function getPendingDonations(): Promise<DonationWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("donations")
    .select(
      `
      id,
      user_id,
      team_id,
      amount,
      points_awarded,
      status,
      proof_url,
      admin_notes,
      comment,
      created_at,
      confirmed_at,
      user:profiles(id, warface_nick, display_name),
      team:teams(id, name)
    `
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as DonationWithRelations[];
}

/** Определяет назначение доната по комментарию и полям: игрок или команда */
function getDonationDestination(d: {
  comment?: string | null;
  admin_notes?: string | null;
  team_id?: string | null;
  user_id?: string | null;
}): "player" | "team" {
  const text = ((d.comment ?? "") + " " + (d.admin_notes ?? "")).toLowerCase();
  const hasTeam = text.includes("команда");
  const hasPlayer = text.includes("игрок");
  if (hasTeam && !hasPlayer) return "team";
  if (hasPlayer && !hasTeam) return "player";
  return d.team_id ? "team" : "player";
}

async function handleDonationAction(
  donationId: string,
  action: "confirm" | "reject"
) {
  "use server";
  const supabase = await createClient();

  const { data: donation } = await supabase
    .from("donations")
    .select("*")
    .eq("id", donationId)
    .single();

  if (!donation) return;

  if (action === "reject") {
    await supabase
      .from("donations")
      .update({ status: "rejected", confirmed_at: new Date().toISOString() })
      .eq("id", donationId);
    return;
  }

  const destination = getDonationDestination(donation);
  const amount = donation.amount ?? 0;
  const unitsOf50 = Math.floor(amount / 50);
  const points =
    destination === "team"
      ? unitsOf50 * 1
      : unitsOf50 * 3;

  if (points > 0) {
    if (destination === "player" && donation.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, points")
        .eq("id", donation.user_id)
        .maybeSingle();
      if (profile) {
        await supabase
          .from("profiles")
          .update({ points: (profile.points ?? 0) + points })
          .eq("id", profile.id);
      }
    }

    if (destination === "team" && donation.team_id) {
      const { data: team } = await supabase
        .from("teams")
        .select("id, points")
        .eq("id", donation.team_id)
        .maybeSingle();
      if (team) {
        await supabase
          .from("teams")
          .update({ points: (team.points ?? 0) + points })
          .eq("id", team.id);
      }
    }
  }

  await supabase
    .from("donations")
    .update({
      status: "confirmed",
      points_awarded: points,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", donationId);
}

export default async function AdminDonationsPage() {
  const [profile, donations] = await Promise.all([
    getCurrentProfile(),
    getPendingDonations(),
  ]);
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen p-6">
      <AdminNav active="donations" />

      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Подтверждение донатов
        </h1>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-100">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
            📌 ИНСТРУКЦИЯ ПО НАЧИСЛЕНИЮ ОЧКОВ ЗА ДОНАТЫ
          </h2>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs sm:text-sm">
            <li>
              Получен донат (уведомление в Telegram / CloudTips / почта).
            </li>
            <li>
              Проверить комментарий к платежу:
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>указан ли ник игрока;</li>
                <li>
                  указано ли{" "}
                  <span className="font-mono text-[11px] sm:text-xs">
                    &quot;игрок&quot;
                  </span>{" "}
                  или{" "}
                  <span className="font-mono text-[11px] sm:text-xs">
                    &quot;команда [название]&quot;
                  </span>
                  .
                </li>
              </ul>
            </li>
            <li>
              Зайти в админку → раздел{" "}
              <span className="font-semibold">&quot;Донаты&quot;</span> → блок{" "}
              <span className="font-semibold">&quot;Ожидают подтверждения&quot;</span>.
            </li>
            <li>Найти платёж по сумме и времени.</li>
            <li>
              Нажать <span className="font-semibold">&quot;Подтвердить&quot;</span> — очки
              начислятся автоматически:
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  если указано &quot;игрок&quot; → очки уйдут в{" "}
                  <span className="font-mono text-[11px] sm:text-xs">
                    profiles.points
                  </span>
                  ;
                </li>
                <li>
                  если указано &quot;команда&quot; → очки уйдут в{" "}
                  <span className="font-mono text-[11px] sm:text-xs">
                    teams.points
                  </span>
                  .
                </li>
              </ul>
            </li>
            <li>
              При отсутствии ника или неясности назначения доната —{" "}
              <span className="font-semibold">отклонить</span> с комментарием.
            </li>
          </ol>
          <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
            Текущие тарифы: игрок — 50₽ = 3 очка; команда — 50₽ = 1 очко (расчёт
            идёт от кратных 50₽).
          </p>
        </div>
        {donations.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Нет донатов в статусе &laquo;pending&raquo;.
          </p>
        ) : (
          <ul className="space-y-3">
            {donations.map((d) => {
              const destination = getDonationDestination(d);
              const isTeam = destination === "team";
              const name = isTeam
                ? d.team?.name ?? d.team_id ?? "—"
                : d.user?.warface_nick ??
                  d.user?.display_name ??
                  d.user_id ??
                  "—";

              return (
                <li
                  key={d.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="space-y-1">
                    <div>
                      <span className="text-neutral-500">Назначение: </span>
                      <span className="font-medium text-white">
                        {destination === "team" ? "Команда" : "Игрок"}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500">
                        {isTeam ? "Команда" : "Игрок"}:{" "}
                      </span>
                      <span className="font-medium text-white">{name}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Сумма: </span>
                      <span className="font-mono text-[#F97316]">
                        {d.amount} ₽
                      </span>
                    </div>
                    {d.proof_url && (
                      <div>
                        <a
                          href={d.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Открыть подтверждение
                        </a>
                      </div>
                    )}
                    <div className="text-xs text-neutral-500">
                      Дата:{" "}
                      {new Date(d.created_at).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <form
                      action={async () => {
                        "use server";
                        await handleDonationAction(d.id, "confirm");
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        Подтвердить
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await handleDonationAction(d.id, "reject");
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Отклонить
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

