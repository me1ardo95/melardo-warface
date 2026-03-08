"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createTournament } from "@/app/actions/data";

export default function CreateTournamentForm() {
  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await createTournament(formData);
      return result?.error ? { error: result.error } : null;
    },
    null
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Название турнира
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          placeholder="Например: Warface Cup 2026"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="start_date" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Дата начала
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div>
          <label htmlFor="end_date" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Дата окончания
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
      </div>
      <div>
        <label htmlFor="format" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Формат
        </label>
        <select
          id="format"
          name="format"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        >
          <option value="">— Выберите —</option>
          <option value="Single Elimination">Single Elimination</option>
          <option value="Double Elimination">Double Elimination</option>
          <option value="Round Robin">Round Robin</option>
          <option value="Swiss">Swiss</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="max_teams"
          className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Максимум команд (для плей-офф)
        </label>
        <input
          id="max_teams"
          name="max_teams"
          type="number"
          min={2}
          step={1}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          placeholder="Например: 8 или 16"
        />
      </div>
      <div>
        <label htmlFor="game" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Игра (необязательно)
        </label>
        <input
          id="game"
          name="game"
          type="text"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          placeholder="Warface"
        />
      </div>
      <div>
        <label htmlFor="status" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Статус
        </label>
        <select
          id="status"
          name="status"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        >
          <option value="upcoming">Регистрация</option>
          <option value="ongoing">Идёт</option>
          <option value="completed">Завершён</option>
          <option value="cancelled">Отменён</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
        >
          Создать турнир
        </button>
        <Link
          href="/tournaments"
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          Отмена
        </Link>
      </div>
    </form>
  );
}
