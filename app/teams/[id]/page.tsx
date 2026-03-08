import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTeamWithMembership,
  getTeamMembers,
  getCurrentProfile,
  getTeamsWithStats,
  getTeamJoinRequests,
} from "@/app/actions/data";
import { createClient } from "@/lib/supabase/server";
import type { Notification, Match, Team } from "@/lib/types";
import { ComplaintButton } from "@/app/components/ComplaintButton";
import TeamInviteForm from "./TeamInviteForm";
import TransferCaptainForm from "./TransferCaptainForm";
import LeaveTeamButton from "./LeaveTeamButton";
import JoinRequestsSection from "./JoinRequestsSection";

type MatchWithTeams = Match & {
  team1?: Pick<Team, "id" | "name"> | null;
  team2?: Pick<Team, "id" | "name"> | null;
};

async function getTeamLastMatches(teamId: string): Promise<MatchWithTeams[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select(
      `*,
      team1:teams!matches_team1_id_fkey(id, name),
      team2:teams!matches_team2_id_fkey(id, name)
    `
    )
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(5);
  return (data ?? []) as MatchWithTeams[];
}

type Props = { params: Promise<{ id: string }> };

async function getTeamNotifications(teamId: string): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []) as Notification[];
}

export default async function TeamPage({ params }: Props) {
  const { id } = await params;
  const [{ team, role }, members, profile, teamsWithStats] = await Promise.all([
    getTeamWithMembership(id),
    getTeamMembers(id),
    getCurrentProfile(),
    getTeamsWithStats(),
  ]);

  if (!team) notFound();

  const teamStats = teamsWithStats.find((t) => t.id === team.id);
  const isCaptain = role === "captain";
  const currentUserId = profile?.id ?? "";
  const [joinRequests, notifications, lastMatches] = await Promise.all([
    isCaptain ? getTeamJoinRequests(team.id) : Promise.resolve([]),
    isCaptain ? getTeamNotifications(team.id) : Promise.resolve([]),
    getTeamLastMatches(team.id),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/teams"
        className="inline-flex items-center text-sm text-[#9CA3AF] hover:text-white"
      >
        ← К списку команд
      </Link>

      <div className="card-surface p-6 sm:p-8">
        <div className="flex items-start gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#2A2F3A] bg-[#11141A]">
            {team.logo_url ? (
              <img
                src={team.logo_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-[#4B5563]">
                {team.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl tracking-[0.16em] text-white [font-family:var(--font-display-alt)]">
                {team.name}
              </h1>
              {isCaptain && (
                <span className="rounded-full bg-[#1F2937] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#F97316]">
                  Капитан отряда
                </span>
              )}
            </div>
            {team.city && (
              <p className="mt-1 text-sm text-[#9CA3AF]">📍 {team.city}</p>
            )}
            {teamStats && (
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="text-[#10B981]">
                  🏆 {teamStats.wins} побед
                </span>
                <span className="text-[#60A5FA]">
                  ⚔️ {teamStats.total_matches} матчей
                </span>
                <span className="text-[#F97316]">
                  📊 {teamStats.points} очков
                </span>
                <span className="text-[#A855F7]">
                  👥 {teamStats.member_count}/7 игроков
                </span>
                {teamStats.last_results.length > 0 && (
                  <span className="flex items-center gap-1 text-[#F97316]">
                    🔥{" "}
                    {teamStats.last_results
                      .map((r) => (r === "win" ? "🏆" : "💔"))
                      .join(" ")}
                  </span>
                )}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {isCaptain && (
                <Link
                  href={`/teams/${id}/edit`}
                  className="btn-outline text-xs uppercase tracking-wide"
                >
                  Управление командой
                </Link>
              )}
              {role && (
                <LeaveTeamButton teamId={team.id} />
              )}
              <ComplaintButton
                teamId={team.id}
                className="rounded border border-[#2A2F3A] bg-[#11141A] px-2 py-1 text-xs font-medium text-[#B0B8C5] hover:bg-[#1F2937] hover:text-white"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
          {team.description && (
            <div className="border-t border-[#2A2F3A] pt-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Описание
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[#E5E7EB]">
                {team.description}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-[#2A2F3A] bg-[#050816] p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
              💰 ПОДДЕРЖАТЬ КОМАНДУ
            </h2>
            <p className="mt-3 text-sm text-[#B0B8C5]">
              Донат на общий счёт отряда. После подтверждения администратором
              очки будут начислены в рейтинг команды и повлияют на её позицию в
              лиге.
            </p>
            <div className="mt-4 rounded-lg border border-[#2A2F3A] bg-[#020617] p-4 text-sm text-[#E5E7EB]">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
                📊 ТАРИФ КОМАНДЫ
              </h3>
              <ul className="mt-3 space-y-1 text-sm text-[#E5E7EB]">
                <li>• 50₽ = +1 очко</li>
                <li>• 500₽ = +10 очков</li>
                <li>• 3000₽ = +60 очков</li>
              </ul>
              <p className="mt-3 text-xs text-[#9CA3AF]">
                В комментарии к платежу укажите название команды и ник, от чьего
                лица отправляется донат.
              </p>
            </div>
            <a
              href="https://pay.cloudtips.ru/p/c9449598"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-black shadow-lg hover:bg-[#FDBA74]"
            >
              💳 Поддержать команду
            </a>
          </div>
        </div>
      </div>

      {isCaptain && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card-surface p-6">
            <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
              Уведомления команды
            </h2>
            {notifications.length === 0 ? (
              <p className="mt-3 text-sm text-[#9CA3AF]">
                Для этой команды пока нет активных уведомлений.
              </p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.link}
                      className={`flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-[#111827] ${
                        n.is_read ? "opacity-70" : ""
                      }`}
                    >
                      <span className="mt-0.5 text-[#F97316]">🔔</span>
                      <div className="space-y-0.5">
                        <div className="font-medium text-white">
                          {n.title}
                        </div>
                        <div className="text-xs text-[#B0B8C5]">
                          {n.message}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4">
            <TeamInviteForm teamId={team.id} />
            <TransferCaptainForm
              teamId={team.id}
              members={members}
              currentUserId={currentUserId}
            />
            <JoinRequestsSection teamId={team.id} requests={joinRequests} />
          </div>
        </div>
      )}

      <div className="card-surface p-6">
        <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
          Последние матчи
        </h2>
        {lastMatches.length === 0 ? (
          <p className="mt-3 text-sm text-[#6B7280]">
            Матчей пока нет.
          </p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {lastMatches.map((m) => {
              const isTeam1 = m.team1_id === team.id;
              const scoreFor = isTeam1 ? m.score_team1 : m.score_team2;
              const scoreAgainst = isTeam1 ? m.score_team2 : m.score_team1;
              const isWin = m.status === "completed" && scoreFor > scoreAgainst;
              const opponent = isTeam1 ? m.team2?.name : m.team1?.name;
              const myTeam = isTeam1 ? m.team1?.name : m.team2?.name;

              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#2A2F3A] bg-[#11141A] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={isWin ? "text-[#10B981]" : "text-[#EF4444]"}>
                        {isWin ? "✅" : "❌"}
                      </span>
                      <span className="text-[#E5E7EB]">
                        {myTeam ?? "—"} vs {opponent ?? "—"}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[#9CA3AF]">
                      <span className="font-mono">{m.score_team1} : {m.score_team2}</span>
                      <span>
                        {m.completed_at
                          ? new Date(m.completed_at).toLocaleString("ru-RU")
                          : "Запланирован"}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/matches/${m.id}`}
                    className="shrink-0 rounded border border-[#2A2F3A] px-2 py-1 text-xs font-medium text-[#F97316] hover:bg-[#1F2937]"
                  >
                    Подробнее
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!isCaptain && (
        <div className="card-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Состав команды
          </h2>
          <p className="mt-2 text-sm text-[#D1D5DB]">
            Управление составом доступно капитану. Вы можете покинуть отряд
            через кнопку выше.
          </p>
        </div>
      )}
    </div>
  );
}

