"use client";

import { useState } from "react";

type Props = {
  matchId: string;
  team1Name?: string;
  team2Name?: string;
};

export default function MatchConfirmForm({
  matchId,
  team1Name = "Команда 1",
  team2Name = "Команда 2",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("match_id", matchId);

    try {
      const res = await fetch("/api/match/confirm", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось отправить подтверждение");
        return;
      }
      if (data.status === "completed") {
        setMessage("Результат подтверждён обеими командами. Матч завершён.");
      } else if (data.status === "disputed") {
        setMessage(
          "Подтверждения капитанов расходятся. Матч отправлен на рассмотрение администратору."
        );
      } else {
        setMessage(
          "Подтверждение отправлено. Ожидается подтверждение второй команды."
        );
      }
      form?.reset();
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="score_team1"
            className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Счёт {team1Name}
          </label>
          <input
            id="score_team1"
            name="score_team1"
            type="number"
            min={0}
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div>
          <label
            htmlFor="score_team2"
            className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Счёт {team2Name}
          </label>
          <input
            id="score_team2"
            name="score_team2"
            type="number"
            min={0}
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="screenshot"
          className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Скриншот послематчевой статистики
        </label>
        <input
          id="screenshot"
          name="screenshot"
          type="file"
          accept=".jpg,.jpeg,.png"
          required
          className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-800 hover:file:bg-neutral-200 dark:text-neutral-300 dark:file:bg-neutral-800 dark:file:text-neutral-100 dark:hover:file:bg-neutral-700"
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          На скриншоте должны быть видны никнеймы всех игроков обоих команд,
          итоговый счёт и полная статистика матча.
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          name="agree"
          className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
          required
        />
        <span>
          Подтверждаю, что скриншот соответствует реальному результату
          сыгранного матча.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-neutral-900"
      >
        {loading ? "Отправка…" : "Отправить подтверждение"}
      </button>
    </form>
  );
}

