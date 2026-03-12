import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/app/actions/data";
import { BackButton } from "@/app/components/BackButton";
import ProfileEditForm from "./ProfileEditForm";

export default async function ProfileEditPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

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
          href="/profile"
          className="font-medium text-neutral-900 dark:text-neutral-100"
        >
          Профиль
        </Link>
        <Link
          href="/teams"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Команды
        </Link>
        <Link
          href="/matches"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Вызовы
        </Link>
        <Link
          href="/tournaments"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Турниры
        </Link>
        <Link
          href="/rankings"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Рейтинги
        </Link>
      </nav>

      <div className="mx-auto max-w-xl">
        <BackButton className="mb-4 inline-block text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          ← Назад к профилю
        </BackButton>
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Редактирование профиля
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Измените ник в Warface. По нику в игре вас будут добавлять в команды.
          </p>
          <ProfileEditForm
            warfaceNick={profile.warface_nick ?? null}
            rank={(profile as { rank?: number | null }).rank ?? null}
          />
        </div>
      </div>
    </div>
  );
}
