import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/app/actions/data";
import { AdminNav } from "../AdminNav";
import { ComplaintsActions } from "./ComplaintsActions";

type ComplaintRow = {
  id: string;
  user_id: string;
  match_id: string | null;
  player_id: string | null;
  team_id: string | null;
  subject: string;
  description: string | null;
  reason: string | null;
  proof_url: string | null;
  status: string;
  created_at: string;
  profile?: { warface_nick: string | null; display_name: string | null };
  match?: { team1?: { name: string } | null; team2?: { name: string } | null };
};

async function getPendingComplaints(): Promise<ComplaintRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("complaints")
    .select(
      `
      id, user_id, match_id, player_id, team_id, subject, description, reason, proof_url, status, created_at
    `
    )
    .in("status", ["open", "under_review"])
    .order("created_at", { ascending: false });

  if (error) return [];

  const rows = (data ?? []) as ComplaintRow[];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const matchIds = [...new Set(rows.map((r) => r.match_id).filter(Boolean))] as string[];

  const [profilesRes, matchesRes] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, warface_nick, display_name").in("id", userIds)
      : { data: [] },
    matchIds.length
      ? supabase
          .from("matches")
          .select("id, team1:teams!matches_team1_id_fkey(name), team2:teams!matches_team2_id_fkey(name)")
          .in("id", matchIds)
      : { data: [] },
  ]);

  type ProfileRow = { id: string; warface_nick: string | null; display_name: string | null };
  type MatchRow = {
    id: string;
    team1: { name: string } | { name: string }[] | null;
    team2: { name: string } | { name: string }[] | null;
  };
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p: ProfileRow) => [
      p.id,
      { warface_nick: p.warface_nick, display_name: p.display_name },
    ])
  );
  const matchMap = new Map(
    (matchesRes.data ?? []).map((m: MatchRow) => {
      const t1 = Array.isArray(m.team1) ? m.team1[0] : m.team1;
      const t2 = Array.isArray(m.team2) ? m.team2[0] : m.team2;
      return [m.id, { team1: t1 ?? null, team2: t2 ?? null }];
    })
  );

  return rows.map((r) => ({
    ...r,
    profile: profileMap.get(r.user_id) ?? undefined,
    match: r.match_id ? matchMap.get(r.match_id) : undefined,
  }));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU");
}

export default async function AdminComplaintsPage() {
  const [profile, complaints] = await Promise.all([
    getCurrentProfile(),
    getPendingComplaints(),
  ]);
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen p-6">
      <AdminNav active="complaints" />

      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Жалобы
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Список жалоб для рассмотрения. Принять — закрыть жалобу как
            рассмотренную. Отклонить — отклонить жалобу.
          </p>
        </div>

        {complaints.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            Нет жалоб со статусом «на рассмотрении».
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {complaints.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                      {c.subject}
                      {c.reason && (
                        <span className="ml-2 text-xs text-neutral-500">
                          ({c.reason})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      От:{" "}
                      {c.profile?.warface_nick ?? c.profile?.display_name ?? "—"}
                    </div>
                    {c.description && (
                      <p className="mt-1 text-neutral-600 dark:text-neutral-300">
                        {c.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {c.match_id && (
                        <Link
                          href={`/matches/${c.match_id}`}
                          className="text-blue-500 hover:underline"
                        >
                          Матч:{" "}
                          {c.match
                            ? `${c.match.team1?.name ?? "—"} vs ${c.match.team2?.name ?? "—"}`
                            : "Подробнее"}
                        </Link>
                      )}
                      {c.player_id && (
                        <Link
                          href={`/players/${c.player_id}`}
                          className="text-blue-500 hover:underline"
                        >
                          Профиль игрока
                        </Link>
                      )}
                      {c.team_id && (
                        <Link
                          href={`/teams/${c.team_id}`}
                          className="text-blue-500 hover:underline"
                        >
                          Профиль команды
                        </Link>
                      )}
                      {c.proof_url && (
                        <a
                          href={c.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          Скриншот/доказательство
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {formatDate(c.created_at)}
                    </div>
                  </div>
                  <ComplaintsActions complaintId={c.id} status={c.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
