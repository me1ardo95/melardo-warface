import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  completed: "Завершён",
  finished: "Завершён",
  cancelled: "Отменён",
};

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU");
}

export default async function TournamentsHistoryPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      name,
      status,
      start_time,
      start_date,
      winner_team_id,
      winner:teams!tournaments_winner_team_id_fkey(id, name)
    `
    )
    .in("status", ["completed", "finished", "cancelled"])
    .order("start_date", { ascending: false, nullsFirst: false })
    .limit(100);

  const tournaments = (data ?? []) as any[];

  return (
    <div className="space-y-6">
      <div className="card-surface mx-auto max-w-4xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
              История турниров
            </h1>
            <p className="mt-2 text-sm text-[#B0B8C5]">
              Завершённые турниры и победители.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tournaments" className="btn-outline text-xs uppercase tracking-wide">
              К турнирам
            </Link>
            <Link href="/tournament-leaderboard" className="btn-primary text-xs uppercase tracking-wide">
              Лидерборд
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl">
        {tournaments.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">Пока нет завершённых турниров.</p>
        ) : (
          <ul className="space-y-4">
            {tournaments.map((t) => {
              const when = formatDateTime((t.start_time ?? t.start_date) as string | null);
              const winnerName = t.winner?.name ?? "—";
              const statusLabel = STATUS_LABELS[t.status] ?? t.status;

              return (
                <li key={t.id} className="card-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{t.name}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#B0B8C5]">
                        <span>🗓 {when}</span>
                        <span>·</span>
                        <span>Статус: {statusLabel}</span>
                        <span>·</span>
                        <span>Победитель: {winnerName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tournaments/${t.id}`}
                        className="rounded-md bg-[#11141A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F2933]"
                      >
                        Подробнее
                      </Link>
                      <Link
                        href={`/tournaments/${t.id}/bracket`}
                        className="rounded-md border border-neutral-700 bg-black/40 px-4 py-2 text-sm font-medium text-white hover:bg-black/60"
                      >
                        Сетка
                      </Link>
                    </div>
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

