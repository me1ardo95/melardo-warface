import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Row = {
  team_id: string;
  wins: number;
  tournament_points: number;
  team_name: string;
};

export default async function TournamentLeaderboardPage() {
  const supabase = await createClient();

  const [{ data: tournaments }, { data: teams }, { data: pointsHistory }] =
    await Promise.all([
      supabase
        .from("tournaments")
        .select("id, winner_team_id, status")
        .in("status", ["completed", "finished"])
        .not("winner_team_id", "is", null)
        .limit(500),
      supabase.from("teams").select("id, name, points").limit(5000),
      supabase
        .from("team_points_history")
        .select("team_id, delta, comment")
        .ilike("comment", "Награда за % место турнира%")
        .limit(5000),
    ]);

  const teamNameById = new Map((teams ?? []).map((t: any) => [t.id as string, String(t.name ?? "—")]));

  const winsByTeam = new Map<string, number>();
  (tournaments ?? []).forEach((t: any) => {
    const tid = t.winner_team_id as string | null;
    if (!tid) return;
    winsByTeam.set(tid, (winsByTeam.get(tid) ?? 0) + 1);
  });

  const pointsByTeam = new Map<string, number>();
  (pointsHistory ?? []).forEach((p: any) => {
    const tid = p.team_id as string | null;
    const delta = Number(p.delta ?? 0) || 0;
    if (!tid) return;
    pointsByTeam.set(tid, (pointsByTeam.get(tid) ?? 0) + delta);
  });

  const rows: Row[] = [...new Set([...winsByTeam.keys(), ...pointsByTeam.keys()])].map((team_id) => ({
    team_id,
    wins: winsByTeam.get(team_id) ?? 0,
    tournament_points: pointsByTeam.get(team_id) ?? 0,
    team_name: teamNameById.get(team_id) ?? "—",
  }));

  rows.sort((a, b) => b.wins - a.wins || b.tournament_points - a.tournament_points || a.team_name.localeCompare(b.team_name));

  return (
    <div className="space-y-6">
      <div className="card-surface mx-auto max-w-4xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
              Лидерборд турниров
            </h1>
            <p className="mt-2 text-sm text-[#B0B8C5]">
              Лучшие команды по победам и турнирным очкам.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tournaments" className="btn-outline text-xs uppercase tracking-wide">
              Турниры
            </Link>
            <Link href="/tournaments/history" className="btn-primary text-xs uppercase tracking-wide">
              История
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl">
        {rows.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">Пока нет данных для лидерборда.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-[#11141A]">
            <table className="min-w-full divide-y divide-neutral-800 text-sm">
              <thead className="bg-black/30">
                <tr className="text-left text-neutral-300">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Команда</th>
                  <th className="px-4 py-3">Победы</th>
                  <th className="px-4 py-3">Очки турниров</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {rows.slice(0, 100).map((r, idx) => (
                  <tr key={r.team_id} className="text-white">
                    <td className="px-4 py-3 text-neutral-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{r.team_name}</td>
                    <td className="px-4 py-3 font-mono">{r.wins}</td>
                    <td className="px-4 py-3 font-mono">{r.tournament_points}</td>
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

