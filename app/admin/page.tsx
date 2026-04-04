import { redirect } from "next/navigation";
import { getCurrentProfile, getTeams, getTournaments } from "@/app/actions/data";
import AdminProfileTeamSearch from "./AdminProfileTeamSearch";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const [teams, tournaments] = await Promise.all([
    getTeams(),
    getTournaments(),
  ]);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Панель администратора
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Быстрый обзор и инструменты для управления турнирами, командами и
            игроками.
          </p>
        </div>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Команды
            </h2>
            <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              {teams.length}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Турниры
            </h2>
            <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              {tournaments.length}
            </p>
          </div>
        </div>

        <AdminProfileTeamSearch />
      </div>
    </div>
  );
}
