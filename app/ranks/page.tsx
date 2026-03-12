import { createClient } from "@/lib/supabase/server";
import type { RankDivision } from "@/lib/types";
import Link from "next/link";

export default async function RanksPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rank_divisions")
    .select("*")
    .order("min_rating", { ascending: true });

  const ranks = (data ?? []) as RankDivision[];

  const formatRange = (min: number, max: number | null) => {
    if (max == null) return `${min}+`;
    return `${min} – ${max}`;
  };

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
          Ранги
        </span>
      </nav>

      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Ранговые дивизионы
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Ранги определяются по вашему рейтингу. Побеждайте в матчах, чтобы подниматься по дивизионам.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {ranks.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-center gap-3">
                {r.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.icon}
                    alt={r.name}
                    className="h-10 w-10 rounded-md border border-neutral-700 object-contain"
                  />
                )}
                <div>
                  <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    {r.name}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Рейтинг: {formatRange(r.min_rating, r.max_rating)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {ranks.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Ранговые дивизионы ещё не настроены.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

