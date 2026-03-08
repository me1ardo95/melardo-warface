import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/app/components/BackButton";
import { ComplaintButton } from "@/app/components/ComplaintButton";
import { createClient } from "@/lib/supabase/server";
import type { Match, Team, Tournament } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

type MatchWithRelations = Match & {
  team1?: Pick<Team, "id" | "name" | "logo_url"> | null;
  team2?: Pick<Team, "id" | "name" | "logo_url"> | null;
  tournament?: Pick<Tournament, "id" | "name" | "status"> | null;
};

async function getMatch(id: string): Promise<MatchWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
      *,
      team1:teams!matches_team1_id_fkey(id, name, logo_url),
      team2:teams!matches_team2_id_fkey(id, name, logo_url),
      tournament:tournaments(id, name, status)
    `
    )
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as MatchWithRelations;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU");
}

export default async function MatchPage({ params }: Props) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const title = `${match.team1?.name ?? "Команда 1"} vs ${
    match.team2?.name ?? "Команда 2"
  }`;

  return (
    <div className="min-h-screen p-6">
      <nav className="mb-6 flex items-center gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <Link
          href="/"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Главная
        </Link>
        <Link
          href="/matches"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Вызовы и матчи
        </Link>
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          Матч
        </span>
      </nav>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h1>

          <dl className="mt-4 space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
            <div className="flex justify-between">
              <dt>Статус</dt>
              <dd>{match.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Счёт</dt>
              <dd>
                {match.score_team1} : {match.score_team2}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Запланирован</dt>
              <dd>{formatDate(match.scheduled_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Завершён</dt>
              <dd>{formatDate(match.completed_at)}</dd>
            </div>
            {match.tournament && (
              <div className="flex justify-between">
                <dt>Турнир</dt>
                <dd>
                  <Link
                    href={`/tournaments/${match.tournament.id}`}
                    className="text-blue-500 hover:underline"
                  >
                    {match.tournament.name}
                  </Link>
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/matches/confirm/${match.id}`}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Подтвердить результат
            </Link>
            <ComplaintButton
              matchId={match.id}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
            />
            <BackButton className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
              К списку матчей
            </BackButton>
          </div>
        </div>
      </div>
    </div>
  );
}

