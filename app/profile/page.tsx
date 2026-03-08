import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentProfile,
  getPendingInvitationsForCurrentUser,
} from "@/app/actions/data";
import { createClient } from "@/lib/supabase/server";
import type { Notification, Match, Team } from "@/lib/types";
import ProfileInvitations from "./ProfileInvitations";
import DeleteAccountSection from "./DeleteAccountSection";
import { ComplaintButton } from "@/app/components/ComplaintButton";

type MatchWithTeams = Match & {
  team1?: Pick<Team, "id" | "name"> | null;
  team2?: Pick<Team, "id" | "name"> | null;
};

async function getProfileLastMatches(
  userId: string
): Promise<MatchWithTeams[]> {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!membership?.team_id) return [];

  const { data } = await supabase
    .from("matches")
    .select(
      `*,
      team1:teams!matches_team1_id_fkey(id, name),
      team2:teams!matches_team2_id_fkey(id, name)
    `
    )
    .or(`team1_id.eq.${membership.team_id},team2_id.eq.${membership.team_id}`)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(5);
  return (data ?? []) as MatchWithTeams[];
}

async function getProfileNotifications(
  userId: string
): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []) as Notification[];
}

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const [invitations, notifications, lastMatches, membershipRes] = await Promise.all([
    getPendingInvitationsForCurrentUser(),
    getProfileNotifications(profile.id),
    getProfileLastMatches(profile.id),
    (async () => {
      const s = await import("@/lib/supabase/server").then((x) => x.createClient());
      return s.from("team_members").select("team_id").eq("user_id", profile.id).limit(1).maybeSingle();
    })(),
  ]);
  const myTeamId =
    membershipRes?.data && typeof membershipRes.data === "object" && "team_id" in membershipRes.data
      ? (membershipRes.data as { team_id: string }).team_id
      : null;

  const displayName =
    profile.warface_nick || profile.display_name || profile.email || "Игрок";
  const initial = displayName.charAt(0).toUpperCase();

  const isFreeAgent = !profile.points || profile.points <= 0;

  return (
    <div className="space-y-6">
      <div className="card-surface flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-start gap-6">
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-24 w-24 shrink-0 rounded-full border-4 border-[#E63946] object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-[#E63946] bg-[#11141A] text-4xl font-semibold text-[#F97316] shadow-lg">
                {initial}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl tracking-[0.12em] text-white [font-family:var(--font-display-alt)]">
                {displayName}
              </h1>
              <span className="rounded-full border border-[#2A2F3A] bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#B0B8C5]">
                {profile.warface_nick ? "Боевой профиль" : "Профиль игрока"}
              </span>
            </div>
            <p className="text-sm text-[#B0B8C5]">
              Ник в Warface:{" "}
              <span className="font-semibold text-white">
                {profile.warface_nick ?? "не указан"}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link href="/profile/edit" className="btn-primary text-xs">
                Редактировать профиль
              </Link>
              {myTeamId ? (
                <Link
                  href={`/teams/${myTeamId}`}
                  className="btn-outline text-xs"
                >
                  Моя команда
                </Link>
              ) : (
                <span className="rounded border border-[#374151] bg-[#1F2937] px-3 py-1.5 text-xs font-medium text-[#6B7280] cursor-default">
                  Не в команде
                </span>
              )}
              <Link
                href="/support"
                className="btn-outline text-xs"
              >
                Поддержать проект
              </Link>
              <ComplaintButton
                playerId={profile.id}
                className="rounded border border-[#2A2F3A] bg-[#11141A] px-2 py-1 text-xs font-medium text-[#B0B8C5] hover:bg-[#1F2937] hover:text-white"
              />
              <span className="text-xs uppercase tracking-wide text-[#B0B8C5]">
                Статус:{" "}
                <span
                  className={
                    isFreeAgent
                      ? "rounded-full bg-[#1F2937] px-2 py-0.5 text-[11px] font-semibold text-[#F97316]"
                      : "rounded-full bg-[#064E3B] px-2 py-0.5 text-[11px] font-semibold text-[#10B981]"
                  }
                >
                  {isFreeAgent ? "Свободный агент" : "В команде"}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#2A2F3A] bg-[#11141A] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#B0B8C5]">
              Общий рейтинг
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-[#F97316] [font-family:var(--font-jetbrains)]">
                {profile.points ?? 0}
              </span>
              <span className="text-xs text-[#6B7280]">очков</span>
            </div>
          </div>
          <div className="rounded-xl border border-[#2A2F3A] bg-[#11141A] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#B0B8C5]">
              Победы
            </div>
            <div className="mt-2 text-3xl font-semibold text-[#10B981] [font-family:var(--font-jetbrains)]">
              —
            </div>
          </div>
          <div className="rounded-xl border border-[#2A2F3A] bg-[#11141A] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#B0B8C5]">
              Матчи
            </div>
            <div className="mt-2 text-3xl font-semibold text-white [font-family:var(--font-jetbrains)]">
              —
            </div>
          </div>
        </div>
      </div>

      <div className="card-surface p-6">
        <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
          Последние матчи
        </h2>
        {lastMatches.length === 0 ? (
          <p className="mt-3 text-sm text-[#6B7280]">
            Матчей пока нет. Примите вызов или зарегистрируйтесь на турнир.
          </p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {lastMatches.map((m) => {
              const isTeam1 = m.team1_id === myTeamId;
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

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card-surface col-span-2 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg tracking-[0.16em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
              Боевые достижения
            </h2>
            <span className="text-xs uppercase tracking-wide text-[#6B7280]">
              скоро
            </span>
          </div>
          <p className="mt-3 text-sm text-[#B0B8C5]">
            Здесь появятся ваши турнирные победы, призовые места и участие в
            финалах MELARDO WARFACE.
          </p>
        </div>

        <div className="card-surface max-h-[260px] overflow-hidden p-6">
          <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
            Уведомления
          </h2>
          {notifications.length === 0 ? (
            <p className="mt-3 text-sm text-[#6B7280]">
              Уведомлений пока нет. Участвуйте в матчах и турнирах, чтобы не
              пропустить важные события.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.link}
                    className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[#111827] ${
                      n.is_read ? "opacity-70" : ""
                    }`}
                  >
                    <span className="mt-0.5 text-[#F97316]">🔔</span>
                    <div className="space-y-0.5">
                      <div className="font-medium text-white">{n.title}</div>
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
      </div>

      <div className="card-surface p-6 sm:p-8">
        <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
          💰 ПОДДЕРЖАТЬ КАК ИГРОКА
        </h2>
        <p className="mt-3 text-sm text-[#B0B8C5]">
          Донат на ваш личный счёт. После подтверждения администратором очки
          будут начислены прямо в ваш профиль и повлияют на ваш рейтинг в лигах
          MELARDO WARFACE.
        </p>
        <div className="mt-4 rounded-xl border border-[#2A2F3A] bg-[#050816] p-4 text-sm text-[#E5E7EB]">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
            📊 ТАРИФ ИГРОКА
          </h3>
          <ul className="mt-3 space-y-1 text-sm text-[#E5E7EB]">
            <li>• 50₽ = +3 очка</li>
            <li>• 500₽ = +30 очков</li>
            <li>• 3000₽ = +90 очков</li>
          </ul>
          <p className="mt-3 text-xs text-[#9CA3AF]">
            В комментарии к платежу обязательно укажите ваш ник в Warface, чтобы
            мы смогли начислить очки.
          </p>
        </div>
        <a
          href="https://pay.cloudtips.ru/p/eceb2434"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-black shadow-lg hover:bg-[#FDBA74]"
        >
          💳 Поддержать как игрок
        </a>
      </div>

      <div className="card-surface p-6">
        <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
          Реферальная ссылка
        </h2>
        <p className="mt-2 text-sm text-[#B0B8C5]">
          Поделитесь ссылкой с друзьями. Когда администратор подтвердит реферальную регистрацию, вы получите дополнительные очки.
        </p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-[#111827] px-3 py-2 font-mono text-xs text-[#E5E7EB]">
              {`https://melardo-warface.ru/ref/${encodeURIComponent(
                profile.warface_nick ?? profile.display_name ?? profile.email ?? profile.id
              )}`}
            </span>
          </div>
        </div>
      </div>

      <ProfileInvitations invitations={invitations} />
      <DeleteAccountSection />
    </div>
  );
}
