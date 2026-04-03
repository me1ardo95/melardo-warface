import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/app/actions/data";
import type { Profile } from "@/lib/types";
import { AdminNav } from "../AdminNav";

type AdminPlayer = Pick<
  Profile,
  "id" | "warface_nick" | "display_name" | "email" | "points" | "created_at"
>;

async function getPlayers(): Promise<AdminPlayer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, warface_nick, display_name, email, points, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];
  return data as unknown as AdminPlayer[];
}

export default async function AdminPlayersPage() {
  const [profile, players] = await Promise.all([
    getCurrentProfile(),
    getPlayers(),
  ]);
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen p-6">
      <AdminNav active="players" />

      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Игроки
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Список игроков платформы MELARDO с быстрым переходом в
            админ‑просмотр профиля.
          </p>
        </div>

        {players.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            Игроков пока нет.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900/60">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Ник / Имя
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Email
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Очки
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Дата регистрации
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {players.map((p) => {
                  const name =
                    p.warface_nick ||
                    p.display_name ||
                    p.email ||
                    "Игрок без ника";
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                      <td className="px-4 py-2 align-middle text-neutral-900 dark:text-neutral-100">
                        <div className="font-medium">{name}</div>
                        {p.warface_nick && p.display_name && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {p.display_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 align-middle text-xs text-neutral-500 dark:text-neutral-400">
                        {p.email ?? "—"}
                      </td>
                      <td className="px-4 py-2 align-middle text-right text-sm font-mono text-[#F97316]">
                        {p.points ?? 0}
                      </td>
                      <td className="px-4 py-2 align-middle text-right text-xs text-neutral-500 dark:text-neutral-400">
                        {new Date(p.created_at).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="px-4 py-2 align-middle text-right">
                        <a
                          href={`/admin/player-view/${p.id}`}
                          className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Открыть
                        </a>
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

