import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClan,
  getClanMembers,
  getClanMatches,
  getClanRole,
  getCurrentUserClan,
} from "@/app/actions/clans";
import LeaveClanButton from "./LeaveClanButton";
import ClanChat from "./ClanChat";

type Props = { params: Promise<{ id: string }> };

function roleLabel(role: string) {
  const m: Record<string, string> = {
    owner: "Владелец",
    captain: "Капитан",
    member: "Участник",
  };
  return m[role] ?? role;
}

export default async function ClanPage({ params }: Props) {
  const { id } = await params;
  const [clan, members, matches, role, myClan] = await Promise.all([
    getClan(id),
    getClanMembers(id),
    getClanMatches(id, 10),
    getClanRole(id),
    getCurrentUserClan(),
  ]);

  if (!clan) notFound();

  const isMember = !!role;
  const canLeave = isMember && role !== "owner";

  return (
    <div className="space-y-8">
      <Link
        href="/clans"
        className="inline-flex text-sm text-[#9CA3AF] hover:text-white"
      >
        ← К списку кланов
      </Link>

      <div className="card-surface rounded-xl p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#2A2F3A] bg-[#11141A]">
            {clan.logo_url ? (
              <img src={clan.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-[#4B5563]">
                {clan.tag?.charAt(0) ?? "?"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl tracking-[0.16em] text-white [font-family:var(--font-display-alt)]">
                {clan.name}
              </h1>
              <span className="rounded bg-[#2A2F3A] px-2 py-0.5 font-mono text-sm text-[#9CA3AF]">
                [{clan.tag}]
              </span>
              <span className="font-mono text-lg text-[#F97316]">{clan.rating}</span>
            </div>
            {clan.description && (
              <p className="mt-2 text-[#9CA3AF]">{clan.description}</p>
            )}
            <p className="mt-1 text-sm text-[#6B7280]">
              Владелец: {clan.owner_nick ?? "—"}
            </p>
            {canLeave && <LeaveClanButton clanId={id} className="mt-4" />}
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9CA3AF]">
          Участники ({members.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-[#2A2F3A] bg-[#11141A]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2F3A] bg-[#0f141b] text-left">
                <th className="px-4 py-3 font-medium text-[#9CA3AF]">Игрок</th>
                <th className="px-4 py-3 font-medium text-[#9CA3AF]">Роль</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-[#1F2937]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/players/${m.user_id}`}
                      className="font-medium text-[#F97316] hover:underline"
                    >
                      {m.warface_nick ?? m.display_name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#9CA3AF]">{roleLabel(m.role)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9CA3AF]">
          История матчей
        </h2>
        {matches.length === 0 ? (
          <div className="rounded-xl border border-[#2A2F3A] bg-[#11141A] px-4 py-8 text-center text-[#9CA3AF]">
            Пока нет матчей
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((cm: any) => {
              const m = cm.match;
              const c1 = cm.clan1;
              const c2 = cm.clan2;
              if (!m || !c1 || !c2) return null;
              const s1 = m.score_team1 ?? 0;
              const s2 = m.score_team2 ?? 0;
              const c1Won = s1 > s2;
              const isClan1 = c1.id === id;
              const myClanWon = isClan1 ? c1Won : !c1Won;
              return (
                <Link
                  key={cm.id}
                  href={`/matches/${cm.match_id}`}
                  className="flex items-center justify-between rounded-lg border border-[#2A2F3A] bg-[#11141A] px-4 py-2 transition-colors hover:border-[#F97316]"
                >
                  <span className={isClan1 && myClanWon ? "text-[#10b981]" : ""}>
                    {c1.name} [{c1.tag}]
                  </span>
                  <span className="font-mono text-[#9CA3AF]">
                    {s1} : {s2}
                  </span>
                  <span className={!isClan1 && myClanWon ? "text-[#10b981]" : ""}>
                    {c2.name} [{c2.tag}]
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {isMember && <ClanChat clanId={id} />}
    </div>
  );
}
