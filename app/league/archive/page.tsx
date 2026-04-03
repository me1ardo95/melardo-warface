import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Season, SeasonArchive, Team } from "@/lib/types";

type ArchiveRow = SeasonArchive & {
  team?: Pick<Team, "id" | "name" | "logo_url"> | null;
};

async function getSeasonsAndArchive() {
  const supabase = await createClient();
  const [{ data: seasons }, { data: archive }] = await Promise.all([
    supabase
      .from("seasons")
      .select("*")
      .order("start_date", { ascending: false }),
    supabase
      .from("season_archive")
      .select(
        `
        id,
        season_id,
        team_id,
        final_rank,
        final_points,
        stats,
        team:teams(id, name, logo_url)
      `
      )
      .order("final_rank", { ascending: true }),
  ]);

  return {
    seasons: (seasons ?? []) as Season[],
    archive: (archive ?? []) as unknown as ArchiveRow[],
  };
}

export default async function LeagueArchivePage() {
  const { seasons, archive } = await getSeasonsAndArchive();

  return (
    <div className="space-y-6">
      <div className="card-surface p-6 sm:p-8">
        <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
          Архив сезонной лиги
        </h1>
        <p className="mt-2 text-sm text-[#B0B8C5]">
          Здесь собраны результаты прошедших сезонов MELARDO. Каждый
          сезон длится 3 месяца, очки команд копятся и фиксируются в архиве по
          окончании сезона.
        </p>
      </div>

      <div className="card-surface p-6">
        <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
          Прошедшие сезоны
        </h2>
        {seasons.length === 0 ? (
          <p className="mt-3 text-sm text-[#9CA3AF]">
            Сезоны ещё не созданы.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {seasons.map((s) => (
              <a
                key={s.id}
                href={`#season-${s.id}`}
                className="rounded-lg border border-[#2A2F3A] bg-[#11141A] px-4 py-3 text-sm text-[#E5E7EB] hover:border-[#F97316]"
              >
                <div className="font-medium">{s.name}</div>
                <div className="mt-1 text-xs text-[#9CA3AF]">
                  {new Date(s.start_date).toLocaleDateString("ru-RU")} —{" "}
                  {new Date(s.end_date).toLocaleDateString("ru-RU")}
                </div>
                {s.is_active && (
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-emerald-400">
                    Активный сезон
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>

      {seasons.map((s) => {
        const rows = archive
          .filter((r) => r.season_id === s.id)
          .sort((a, b) => a.final_rank - b.final_rank)
          .slice(0, 10);

        if (rows.length === 0) return null;

        return (
          <div
            key={s.id}
            id={`season-${s.id}`}
            className="card-surface p-6"
          >
            <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
              {s.name}
            </h2>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              {new Date(s.start_date).toLocaleDateString("ru-RU")} —{" "}
              {new Date(s.end_date).toLocaleDateString("ru-RU")}
            </p>
            <table className="mt-4 w-full table-auto text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="pb-2">Место</th>
                  <th className="pb-2">Команда</th>
                  <th className="pb-2">Очки</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#1F2933]">
                    <td className="py-2 text-[#E5E7EB]">{r.final_rank}</td>
                    <td className="py-2 text-[#E5E7EB]">
                      <Link
                        href={`/teams/${r.team_id}`}
                        className="hover:text-[#F97316]"
                      >
                        {r.team?.name ?? r.team_id}
                      </Link>
                    </td>
                    <td className="py-2 font-mono text-[#F97316]">
                      {r.final_points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

