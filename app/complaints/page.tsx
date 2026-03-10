"use client";

import { useState } from "react";
import Link from "next/link";

const mockMatches = [
  {
    id: "match-1",
    title: "Киберволки vs Теневые драконы",
    date: "12.03.2026",
  },
  {
    id: "match-2",
    title: "Ночные рейдеры vs Пиксельные титаны",
    date: "10.03.2026",
  },
];

const reasons = [
  { id: "referee", label: "Судейство / спорные решения" },
  { id: "cheats", label: "Подозрение на читы или сторонние программы" },
  { id: "behavior", label: "Неправильное поведение игроков" },
  { id: "rules", label: "Нарушение регламента или правил турнира" },
];

export default function ComplaintsPage() {
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    setMessage(
      "Жалоба не отправляется — это демо-форма. Здесь будет интеграция с API /api/complaint/create."
    );
  };

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
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Профиль
        </Link>
        <Link
          href="/matches"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Вызовы
        </Link>
        <Link
          href="/complaints"
          className="font-medium text-neutral-900 dark:text-neutral-100"
        >
          Жалобы
        </Link>
      </nav>
      <div className="mx-auto max-w-xl rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-xl font-semibold">Форма подачи жалобы</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Опишите проблему, с которой вы столкнулись во время вызова. Эти поля
          пока работают как заглушка.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="match"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Вызов
            </label>
            <select
              id="match"
              name="match"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              defaultValue={mockMatches[0]?.id}
            >
              {mockMatches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.title} · {match.date}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="reason"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Причина жалобы
            </label>
            <select
              id="reason"
              name="reason"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              defaultValue={reasons[0]?.id}
            >
              {reasons.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="details"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Описание ситуации
            </label>
            <textarea
              id="details"
              name="details"
              rows={4}
              required
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="Укажите раунд, время, команды и что именно произошло."
            />
          </div>
          {message && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {message}
            </p>
          )}
          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
          >
            Отправить жалобу
          </button>
        </form>
      </div>
    </div>
  );
}

