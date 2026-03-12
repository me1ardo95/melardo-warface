import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentProfile,
  getTournamentsWithDetails,
} from "@/app/actions/data";
import { AdminNav } from "../AdminNav";
import { GenerateBracketButton } from "./GenerateBracketButton";
import { DeleteTournamentButton } from "./DeleteTournamentButton";
import { CreateDailyTournamentButton } from "./CreateDailyTournamentButton";

const STATUS_LABELS: Record<string, string> = {
  upcoming: "Регистрация",
  registration: "Регистрация",
  starting: "Стартует",
  ongoing: "Идёт",
  active: "Идёт",
  completed: "Завершён",
  finished: "Завершён",
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

      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Управление турнирами
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Создание, редактирование, генерация сетки и просмотр команд.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CreateDailyTournamentButton />
            <Link
              href="/admin/tournaments/create"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
            >
              Создать турнир
            </Link>
          </div>
        </div>

        {tournaments.length === 0 ? (
          <p className="mt-4 text-neutral-500 dark:text-neutral-400">
            Турниров пока нет.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Название
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Режим
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Команды
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Статус
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {tournaments.map((t) => {
                  const statusLabel = STATUS_LABELS[t.status] ?? t.status;
                  const modeLabel = (t.game ?? "—") as string;
                  const canGenerate =
                    (t.status === "upcoming" || t.status === "registration") &&
                    !(t as { bracket_data?: unknown }).bracket_data;
                  const maxTeams = (t as { max_teams?: number }).max_teams;

                  return (
                    <tr
                      key={t.id}
                      className="text-sm text-neutral-900 dark:text-neutral-100"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          href={`/tournaments/${t.id}`}
                          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {t.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">
                        {modeLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="font-mono">
                          {t.registered_teams}
                          {typeof maxTeams === "number" ? ` / ${maxTeams}` : ""}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {statusLabel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={`/admin/tournaments/${t.id}/teams`}
                            className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                          >
                            Команды
                          </Link>
                          <Link
                            href={`/tournaments/${t.id}/bracket`}
                            className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                          >
                            Сетка
                          </Link>
                          {canGenerate && (
                            <GenerateBracketButton tournamentId={t.id} />
                          )}
                          <Link
                            href={`/admin/tournaments/${t.id}/edit`}
                            className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                          >
                            Редактировать
                          </Link>
                          <DeleteTournamentButton
                            tournamentId={t.id}
                            tournamentName={t.name}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
