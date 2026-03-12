import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUserTeamIds,
  getRecentMatchesWithDetails,
} from "@/app/actions/data";
import type { Match, PublicChallenge, Team } from "@/lib/types";
import { RandomOpponentButton } from "./RandomOpponentButton";
import { AcceptPublicChallengeButton } from "./AcceptPublicChallengeButton";

const MATCH_STATUS_LABELS: Record<string, string> = {
  scheduled: "ожидание соперника",
  live: "матч начат",
  awaiting_result: "ожидание результата",
  completed: "завершён",
  cancelled: "отменён",
  postponed: "отложен",
  disputed: "спор",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU");
}

type PublicChallengeWithTeam = PublicChallenge & {
  team?: Team | null;
};

type MatchWithTeams = Match & {
  team1?: Team | null;
  team2?: Team | null;
};

export default async function MatchesPage() {
  const supabase = await createClient();
  const myTeamIds = await getCurrentUserTeamIds();
  const primaryTeamId = myTeamIds[0] ?? null;

  const [
    { data: publicChallengesRaw },
    { data: myMatchesRaw },
    recentMatches,
  ] =
    await Promise.all([
      supabase
        .from("public_challenges")
        .select(
          `
          id,
          team_id,
          mode,
          map,
          scheduled_at,
          comment,
          status,
          match_id,
          created_at,
          team:teams(id, name, logo_url, city, mode)
        `
        )
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      myTeamIds.length > 0
        ? supabase
            .from("matches")
            .select(
              `
              *,
              team1:teams!matches_team1_id_fkey(id, name, logo_url),
              team2:teams!matches_team2_id_fkey(id, name, logo_url)
            `
            )
            .or(
              myTeamIds
                .map(
                  (id) =>
                    `team1_id.eq.${id},team2_id.eq.${id}`
                )
                .join(",")
            )
            .order("scheduled_at", {
              ascending: false,
              nullsFirst: false,
            })
        : supabase
            .from("matches")
            .select(
              `
              *,
              team1:teams!matches_team1_id_fkey(id, name, logo_url),
              team2:teams!matches_team2_id_fkey(id, name, logo_url)
            `
            )
            .eq("id", "00000000-0000-0000-0000-000000000000"),
    getRecentMatchesWithDetails(50),
  ]);

  const publicChallenges = (publicChallengesRaw ?? []) as unknown as PublicChallengeWithTeam[];
  const myMatches = (myMatchesRaw ?? []) as unknown as MatchWithTeams[];
  type MatchWithTournament = MatchWithTeams & { tournament?: { id: string; name: string } | null };
  const historyMatches = (recentMatches ?? []) as MatchWithTournament[];

  return (
    <div className="space-y-6">
      <div className="card-surface mx-auto max-w-4xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
            Вызовы
          </h1>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/matches/create"
              className="btn-primary text-xs uppercase tracking-wide"
            >
              🎮 Бросить вызов
            </Link>
            <RandomOpponentButton teamId={primaryTeamId} />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        <section className="card-surface p-6">
          <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
            Активные вызовы
          </h2>
          {publicChallenges.length === 0 ? (
            <p className="mt-3 text-sm text-[#9CA3AF]">
              Пока никто не ищет соперника. Бросьте вызов первым!
            </p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {publicChallenges.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[#2A2F3A] bg-[#11141A] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {c.team?.logo_url ? (
                        <img
                          src={c.team.logo_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F2937] text-xs font-semibold text-[#E5E7EB]">
                          {c.team?.name?.charAt(0).toUpperCase() ?? "—"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-white">
                            {c.team ? c.team.name : "Команда удалена"}
                          </span>
                          <span className="rounded-full bg-[#1F2937] px-2 py-0.5 text-[11px] font-mono text-[#F97316]">
                            {c.mode}
                          </span>
                          {c.map && (
                            <span className="rounded-full bg-[#1F2937] px-2 py-0.5 text-[11px] text-[#9CA3AF]">
                              {c.map}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#9CA3AF]">
                          {c.comment || "Без комментария"}
                        </p>
                        <p className="mt-1 text-[11px] text-[#6B7280]">
                          {formatDate(c.scheduled_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <AcceptPublicChallengeButton
                    challengeId={c.id}
                    myTeamId={primaryTeamId}
                    isOwn={primaryTeamId === c.team_id}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-surface p-6">
          <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
            Мои матчи
          </h2>
          {myTeamIds.length === 0 ? (
            <p className="mt-3 text-sm text-[#9CA3AF]">
              Вы ещё не состоите в команде. Создайте команду или примите
              приглашение, чтобы видеть свои матчи.
            </p>
          ) : myMatches.length === 0 ? (
            <p className="mt-3 text-sm text-[#9CA3AF]">
              Матчей для вашей команды пока нет.
            </p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {myMatches.map((match) => (
                <li
                  key={match.id}
                  className="rounded-lg border border-[#2A2F3A] bg-[#11141A] px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium text-white">
                        {match.team1?.name ?? "—"} vs{" "}
                        {match.team2?.name ?? "—"}
                      </span>
                      <span className="text-[#9CA3AF]">
                        {match.score_team1} – {match.score_team2}
                      </span>
                      <span className="rounded bg-[#1F2937] px-2 py-0.5 text-[11px] text-[#E5E7EB]">
                        {MATCH_STATUS_LABELS[match.status] ?? match.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      {formatDate(match.scheduled_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-surface col-span-full p-6">
          <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
            История матчей
          </h2>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            Последние 50 матчей
          </p>
          {historyMatches.length === 0 ? (
            <p className="mt-3 text-sm text-[#9CA3AF]">
              Матчей пока нет.
            </p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {historyMatches.map((match) => (
                <li
                  key={match.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#2A2F3A] bg-[#11141A] px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-medium text-white">
                      {match.team1?.name ?? "—"} vs {match.team2?.name ?? "—"}
                    </span>
                    <span className="text-[#9CA3AF]">
                      {match.score_team1} – {match.score_team2}
                    </span>
                    <span className="rounded bg-[#1F2937] px-2 py-0.5 text-[11px] text-[#E5E7EB]">
                      {MATCH_STATUS_LABELS[match.status] ?? match.status}
                    </span>
                    {match.tournament?.name && (
                      <Link
                        href={`/tournaments/${match.tournament.id}`}
                        className="text-xs text-[#F97316] hover:underline"
                      >
                        {match.tournament.name}
                      </Link>
                    )}
                  </div>
                  <Link
                    href={`/matches/${match.id}`}
                    className="text-xs text-[#6B7280] hover:text-white"
                  >
                    Подробнее
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
