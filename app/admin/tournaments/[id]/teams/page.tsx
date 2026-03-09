import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/app/actions/data";
import { AdminNav } from "@/app/admin/AdminNav";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminTournamentTeamsPage({ params }: Props) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const { id } = await params;

  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!tournament) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-red-500">Турнир не найден.</p>
        <Link href="/admin/tournaments" className="mt-2 inline-block text-blue-600 hover:underline">
          ← Назад к турнирам
        </Link>
      </div>
    );
  }

  const { data: regs } = await supabase
    .from("tournament_registrations")
    .select("id, team_id, created_at, teams(id, name, logo_url, mode)")
    .eq("tournament_id", id)
    .order("created_at", { ascending: true });

  const teams = (regs ?? []).map((r: { teams?: { id: string; name: string; logo_url?: string | null; mode?: string | null } }) => r.teams).filter(Boolean);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <AdminNav active="tournaments" />
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Зарегистрированные команды
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {tournament.name}
            </p>
          </div>
          <Link
            href="/admin/tournaments"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Назад к турнирам
          </Link>
        </div>

        {teams.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            В этом турнире пока нет зарегистрированных команд.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Команда
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Режим
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {teams.map((team: { id: string; name: string; mode?: string | null }, i: number) => (
                  <tr key={team.id} className="text-sm">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-neutral-500">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                      {team.name}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                      {team.mode ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/team-view/${team.id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Просмотр
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
