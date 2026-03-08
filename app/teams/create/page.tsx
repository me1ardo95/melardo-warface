import Link from "next/link";
import { redirect } from "next/navigation";
import { BackButton } from "@/app/components/BackButton";
import { getCurrentProfile, getIsCurrentUserCaptain } from "@/app/actions/data";
import CreateTeamForm from "./CreateTeamForm";

export default async function CreateTeamPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const isCaptain = await getIsCurrentUserCaptain();

  if (isCaptain) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-xl rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-xl font-semibold">Создание команды</h1>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">
            Вы уже создали команду. Один пользователь может быть капитаном только
            одной команды.
          </p>
          <BackButton className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            К списку команд
          </BackButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <CreateTeamForm />
    </div>
  );
}
