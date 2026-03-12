"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Props = { currentTab: string; basePath?: string };

export default function RankingsTabs({ currentTab, basePath = "/rankings" }: Props) {
  const searchParams = useSearchParams();
  const page = searchParams.get("page") || "1";

  const teamsLink = currentTab === "teams" ? null : `${basePath}?tab=teams&page=${page}`;
  const playersLink = currentTab === "players" ? null : `${basePath}?tab=players&page=${page}`;

  return (
    <div className="mt-4 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
      <Link
        href={teamsLink ?? "#"}
        className={`rounded-t-md px-4 py-2 text-sm font-medium ${
          currentTab === "teams"
            ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
            : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        } ${!teamsLink ? "pointer-events-none" : ""}`}
      >
        Команды
      </Link>
      <Link
        href={playersLink ?? "#"}
        className={`rounded-t-md px-4 py-2 text-sm font-medium ${
          currentTab === "players"
            ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
            : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        } ${!playersLink ? "pointer-events-none" : ""}`}
      >
        Игроки
      </Link>
    </div>
  );
}
