"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const inputClass =
  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors";

export default function TeamsViewToggle() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "tiles";
  const isTable = view === "table";

  return (
    <div className="flex rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-700 dark:bg-neutral-800/50">
      <Link
        href="/teams?view=tiles"
        className={`${inputClass} ${
          !isTable
            ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
            : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        }`}
      >
        Плитки
      </Link>
      <Link
        href="/teams?view=table"
        className={`${inputClass} ${
          isTable
            ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
            : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        }`}
      >
        Таблица лиги
      </Link>
    </div>
  );
}
