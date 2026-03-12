import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/app/components/BackButton";
import { getTournament, getTournamentsWithDetails } from "@/app/actions/data";

const STATUS_LABELS: Record<string, string> = {
  upcoming: "Регистрация",
  registration: "Регистрация",
  starting: "Стартует",
  ongoing: "Идёт",
  active: "Идёт",
  completed: "Завершён",
  finished: "Завершён",
  cancelled: "Отменён",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU");
}

type Props = { params: Promise<{ id: string }> };

export default async function TournamentPage({ params }: Props) {
  const { id } = await params;
  const [tournament, tournamentsWithDetails] = await Promise.all([
    getTournament(id),
    getTournamentsWithDetails(),
  ]);

  if (!tournament) notFound();

  const details = tournamentsWithDetails.find((t) => t.id === id);
  const registeredTeams = details?.registered_teams ?? 0;

  return (
    <div className="min-h-screen p-6">
      <nav className="mb-6 flex items-center gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <Link href="/" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          Главная
        </Link>
        <Link href="/profile" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          Профиль
        </Link>
        <Link href="/teams" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          Команды
        </Link>
        <Link href="/matches" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          Вызовы
        </Link>
        <Link href="/tournaments" className="font-medium text-neutral-900 dark:text-neutral-100">
          Турниры
        </Link>
        <Link href="/rankings" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          Рейтинги
        </Link>
      </nav>
      <div className="mx-auto max-w-2xl">
        <BackButton className="mb-4 inline-block text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          ← К списку турниров
        </BackButton>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {tournament.name}
          </h1>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500 dark:text-neutral-400">Даты</dt>
              <dd>{formatDate(tournament.start_date)} – {formatDate(tournament.end_date)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500 dark:text-neutral-400">Формат</dt>
              <dd>{(tournament as { format?: string }).format ?? tournament.game ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500 dark:text-neutral-400">Команд</dt>
              <dd>{registeredTeams}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500 dark:text-neutral-400">Статус</dt>
              <dd>{STATUS_LABELS[tournament.status] ?? tournament.status}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            {(tournament.status === "upcoming" || tournament.status === "registration") && (
              <Link
                href={`/tournaments/${tournament.id}/register`}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Зарегистрировать команду
              </Link>
            )}
            {(["ongoing", "active", "completed", "finished"] as string[]).includes(
              tournament.status as any
            ) && (
              <Link
                href={`/tournaments/${tournament.id}/bracket`}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Сетка
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
