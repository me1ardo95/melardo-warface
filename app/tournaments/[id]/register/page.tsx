import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { BackButton } from "@/app/components/BackButton";
import { getTournament, getCurrentProfile } from "@/app/actions/data";
import { getTeamsWhereUserIsCaptain } from "@/app/actions/data";
import TournamentRegisterForm from "./TournamentRegisterForm";

type Props = { params: Promise<{ id: string }> };

export default async function TournamentRegisterPage({ params }: Props) {
  const { id } = await params;
  const [tournament, profile, captainTeams] = await Promise.all([
    getTournament(id),
    getCurrentProfile(),
    getTeamsWhereUserIsCaptain(),
  ]);

  if (!tournament) notFound();
  if (!profile) redirect("/login");

  if (tournament.status !== "upcoming") {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-xl">
          <p className="text-neutral-500 dark:text-neutral-400">
            Регистрация на этот турнир закрыта.
          </p>
          <BackButton className="mt-4 inline-block text-blue-600 hover:underline">
            ← Назад к турниру
          </BackButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <nav className="mb-6 flex items-center gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <Link href="/tournaments" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          Турниры
        </Link>
        <Link href={`/tournaments/${id}`} className="font-medium text-neutral-900 dark:text-neutral-100">
          {tournament.name}
        </Link>
      </nav>
      <div className="mx-auto max-w-xl">
        <h1 className="text-xl font-semibold">Регистрация на турнир</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Выберите команду для регистрации
        </p>
        <TournamentRegisterForm tournamentId={id} teams={captainTeams} />
      </div>
    </div>
  );
}
