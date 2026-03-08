import Link from "next/link";
import { getTournamentsWithDetails, getCurrentProfile } from "@/app/actions/data";

const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  upcoming: "Регистрация",
  ongoing: "Идёт",
  completed: "Завершён",
  cancelled: "Отменён",
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  ongoing: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  completed: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU");
}

export default async function TournamentsPage() {
  const [tournaments, profile] = await Promise.all([
    getTournamentsWithDetails(),
    getCurrentProfile(),
  ]);

  const isAdmin = profile?.email === "admin@example.com";

  return (
    <div className="space-y-6">
      <div className="card-surface mx-auto max-w-4xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
            Турниры
          </h1>
          {profile && (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/tournaments/request"
                className="btn-primary text-xs uppercase tracking-wide"
              >
                Запросить турнир
              </Link>
              {isAdmin && (
                <Link
                  href="/tournaments/create"
                  className="btn-outline text-xs uppercase tracking-wide"
                >
                  Создать турнир
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-4xl">
        {tournaments.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">Пока нет турниров.</p>
        ) : (
          <ul className="space-y-4">
            {tournaments.map((t) => (
              <li key={t.id} className="card-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {t.name}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#B0B8C5]">
                      <span>
                        📅 {formatDate(t.start_date)} – {formatDate(t.end_date)}
                      </span>
                      <span>·</span>
                      <span>Формат: {t.format ?? t.game ?? "—"}</span>
                      <span>·</span>
                      <span>👥 {t.registered_teams} команд</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        STATUS_COLORS[t.status] ?? "bg-neutral-100 dark:bg-neutral-800"
                      }`}
                    >
                      {TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}
                    </span>
                    <Link
                      href={`/tournaments/${t.id}`}
                      className="rounded-md bg-[#11141A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F2933]"
                    >
                      {t.status === "upcoming"
                        ? "Зарегистрироваться"
                        : "Подробнее"}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
