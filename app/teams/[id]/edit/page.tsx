import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamWithMembership } from "@/app/actions/data";
import { BackButton } from "@/app/components/BackButton";
import TeamEditForm from "./TeamEditForm";

type Props = { params: Promise<{ id: string }> };

export default async function TeamEditPage({ params }: Props) {
  const { id } = await params;
  const { team, role } = await getTeamWithMembership(id);

  if (!team) notFound();
  if (role !== "captain") {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-xl rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-neutral-600 dark:text-neutral-400">
            Редактировать команду может только капитан.
          </p>
          <BackButton className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
            ← Назад к команде
          </BackButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-xl">
        <BackButton className="mb-4 inline-block text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
          ← Назад к команде
        </BackButton>
        <TeamEditForm team={team} />
      </div>
    </div>
  );
}
