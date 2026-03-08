import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/app/components/BackButton";
import {
  getCurrentProfile,
  getTeam,
  getTeamMembers,
  getTeamsWithStats,
} from "@/app/actions/data";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types";

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

export default async function AdminTeamViewPage({ params }: Props) {
  const adminProfile = await getCurrentProfile();
  if (!adminProfile) redirect("/login");
  if (adminProfile.role !== "admin") redirect("/");

  const { id } = await params;

  const [team, teamsWithStats, members, notifications] = await Promise.all([
    getTeam(id),
    getTeamsWithStats(),
    getTeamMembers(id),
    getTeamNotifications(id),
  ]);

  if (!team) notFound();

  const teamStats = teamsWithStats.find((t) => t.id === team.id);

  return (
    <div className="space-y-6">
      <BackButton className="inline-flex text-sm text-[#F97316] hover:text-[#FDBA74]">
        ← Вернуться в админку
      </BackButton>

      <div className="rounded-lg border border-red-900/60 bg-red-900/20 px-4 py-3 text-sm text-red-50">
        <div className="text-xs font-semibold uppercase tracking-wide">
          ⚠️ Режим просмотра администратора
        </div>
        <p className="mt-1 text-xs text-red-100">
          Вы смотрите команду{" "}
          <span className="font-semibold">{team.name}</span>. Никакие изменения
          не сохраняются.
        </p>
      </div>

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
              <span className="rounded-full bg-[#1F2937] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#F97316]">
                Команда (просмотр)
              </span>
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
              💰 Поддержать команду
            </h2>
            <p className="mt-3 text-sm text-[#B0B8C5]">
              Донат на общий счёт отряда. После подтверждения администратором
              очки будут начислены в рейтинг команды и повлияют на её позицию в
              лиге.
            </p>
            <div className="mt-4 rounded-lg border border-[#2A2F3A] bg-[#020617] p-4 text-sm text-[#E5E7EB]">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
                📊 Тариф команды
              </h3>
              <ul className="mt-3 space-y-1 text-sm text-[#E5E7EB]">
                <li>• 50₽ = +1 очко</li>
                <li>• 500₽ = +10 очков</li>
                <li>• 3000₽ = +60 очков</li>
              </ul>
            </div>
            <p className="mt-3 text-xs text-[#9CA3AF]">
              Кнопка доната скрыта в режиме просмотра администратора.
            </p>
          </div>
        </div>
      </div>

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
                  <div className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-[#111827]">
                    <span className="mt-0.5 text-[#F97316]">🔔</span>
                    <div className="space-y-0.5">
                      <div className="font-medium text-white">{n.title}</div>
                      <div className="text-xs text-[#B0B8C5]">{n.message}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Состав команды
          </h2>
          {members.length === 0 ? (
            <p className="mt-2 text-sm text-[#D1D5DB]">
              Для этой команды пока нет участников.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-[#E5E7EB]">
              {members.map((m) => {
                const name =
                  m.warface_nick || m.display_name || "Игрок без ника";
                const roleLabel =
                  m.role === "captain"
                    ? "Капитан"
                    : m.role === "member"
                    ? "Игрок"
                    : m.role;

                return (
                  <li
                    key={m.user_id}
                    className="flex items-center justify-between rounded-lg border border-[#2A2F3A] bg-[#11141A] px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <Link
                        href={`/admin/player-view/${m.user_id}`}
                        className="font-semibold text-[#F97316] hover:text-[#FDBA74]"
                      >
                        {name}
                      </Link>
                      <span className="text-xs text-[#9CA3AF]">
                        {roleLabel}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

