import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/app/components/BackButton";
import { ComplaintButton } from "@/app/components/ComplaintButton";
import { createClient } from "@/lib/supabase/server";
import type { Match, Team } from "@/lib/types";
import MatchConfirmForm from "./MatchConfirmForm";

type Props = {
  params: Promise<{ id: string }>;
};

async function getMatchWithTeams(id: string): Promise<
  | (Match & {
      team1?: Pick<Team, "id" | "name"> | null;
      team2?: Pick<Team, "id" | "name"> | null;
    })
  | null
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
      *,
      team1:teams!matches_team1_id_fkey(id, name),
      team2:teams!matches_team2_id_fkey(id, name)
    `
    )
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Match & {
    team1?: Pick<Team, "id" | "name"> | null;
    team2?: Pick<Team, "id" | "name"> | null;
  };
}

export default async function MatchConfirmPage({ params }: Props) {
  const { id } = await params;
  const match = await getMatchWithTeams(id);
  if (!match) notFound();

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
      </nav>

      <div className="mx-auto max-w-xl">
        <BackButton className="mb-4 inline-block text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          ← Назад
        </BackButton>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Подтверждение результата матча
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Матч:{" "}
            <span className="font-medium">
              {match.team1?.name ?? "Команда 1"} vs{" "}
              {match.team2?.name ?? "Команда 2"}
            </span>
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Подтверждение должны отправить оба капитана команд. При совпадении
            результатов матч будет автоматически завершён. При расхождении
            подтверждений матч уйдёт на рассмотрение администратору.
          </p>

          <div className="mt-3 flex flex-wrap gap-3">
            <ComplaintButton
              matchId={match.id}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            />
          </div>

          <MatchConfirmForm
            matchId={match.id}
            team1Name={match.team1?.name ?? "Команда 1"}
            team2Name={match.team2?.name ?? "Команда 2"}
          />
        </div>
      </div>
    </div>
  );
}

