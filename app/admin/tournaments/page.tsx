import Link from 'next/link'
import { redirect } from "next/navigation";
import {
  getCurrentProfile,
  getTournamentsWithDetails,
} from "@/app/actions/data";
import { GenerateBracketButton } from "./GenerateBracketButton";
import { AdminNav } from "../AdminNav";

const STATUS_LABELS: Record<string, string> = {
  upcoming: "Регистрация",
  ongoing: "Идёт",
  completed: "Завершён",
  cancelled: "Отменён",
};

export default async function AdminTournamentsPage() {
  const [profile, tournaments] = await Promise.all([
    getCurrentProfile(),
    getTournamentsWithDetails(),
  ]);
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <AdminNav active="tournaments" />

      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Управление турнирами
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Здесь можно просматривать турниры, создавать новые и запускать сетку плей-офф.
            </p>
          </div>
          <Link
            href="/admin/tournaments/create"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
          >
            Создать турнир
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <p className="mt-4 text-neutral-500 dark:text-neutral-400">
            Турниров пока нет.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {tournaments.map((t) => {
              const statusLabel = STATUS_LABELS[t.status] ?? t.status;
              const canGenerate =
                t.status === "upcoming" && !(t as any).bracket_data;

              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/tournaments/${t.id}`}
                        className="text-sm font-semibold text-neutral-900 hover:underline dark:text-neutral-100"
                      >
                        {t.name}
                      </Link>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Формат: {t.format ?? t.game ?? "—"} · Команд:{" "}
                      {t.registered_teams}
                      {typeof (t as any).max_teams === "number"
                        ? ` / ${(t as any).max_teams}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-xs">
                    <Link
                      href={`/tournaments/${t.id}/bracket`}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      Сетка
                    </Link>
                    {canGenerate && (
                      <GenerateBracketButton tournamentId={t.id} />
                    )}
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

