import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/app/actions/data";
import type { Season } from "@/lib/types";
async function getSeasons(): Promise<Season[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .order("start_date", { ascending: false });

  if (error || !data) return [];
  return data as Season[];
}

export default async function AdminSeasonsPage() {
  const [profile, seasons] = await Promise.all([
    getCurrentProfile(),
    getSeasons(),
  ]);
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Сезоны
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Управление сезонами лиги и просмотр архива.
          </p>
        </div>

        {seasons.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            Сезоны ещё не созданы.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {seasons.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {s.name}
                    </span>
                    {s.is_active && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Активный
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {new Date(s.start_date).toLocaleDateString("ru-RU")} —{" "}
                    {new Date(s.end_date).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  ID:{" "}
                  <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                    {s.id}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

