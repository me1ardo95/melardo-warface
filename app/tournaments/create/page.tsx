import Link from "next/link";
import { redirect } from "next/navigation";
import { BackButton } from "@/app/components/BackButton";
import { getCurrentProfile } from "@/app/actions/data";
import CreateTournamentForm from "./CreateTournamentForm";

export default async function CreateTournamentPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

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
      <div className="mx-auto max-w-xl">
        <BackButton className="mb-4 inline-block text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          ← К списку турниров
        </BackButton>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-xl font-semibold">Создать турнир</h1>
          <CreateTournamentForm />
        </div>
      </div>
    </div>
  );
}
