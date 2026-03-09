\"use client\";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminTournamentCreatePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event
  ) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      mode: String(formData.get("mode") || "5x5"),
      format: String(formData.get("format") || "single_elimination"),
      maxTeams: Number(formData.get("max_teams") || 8),
      startDate: String(formData.get("start_date") || "").trim(),
      prizePoolRaw: String(formData.get("prize_pool") || "").trim(),
      description:
        String(formData.get("description") || "").trim() || undefined,
    };

    if (!payload.name) {
      setError("Укажите название турнира.");
      setSubmitting(false);
      return;
    }

    if (!payload.startDate) {
      setError("Укажите дату начала турнира.");
      setSubmitting(false);
      return;
    }

    const prize_pool =
      payload.prizePoolRaw && !Number.isNaN(Number(payload.prizePoolRaw))
        ? Number(payload.prizePoolRaw)
        : undefined;

    try {
      const res = await fetch("/api/admin/tournaments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          mode: payload.mode,
          format: payload.format,
          maxTeams: payload.maxTeams,
          startDate: payload.startDate,
          prizePool,
          description: payload.description,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          (data as any)?.error ??
            "Не удалось создать турнир. Попробуйте ещё раз."
        );
        setSubmitting(false);
        return;
      }

      router.push("/admin/tournaments");
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Создать турнир
          </h1>
          <Link
            href="/admin/tournaments"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Назад к турнирам
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100"
            >
              Название турнира<span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none ring-0 placeholder:text-neutral-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="Например: MELARDO WARFACE CUP"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Режим игры
              </legend>
              <div className="space-y-2 text-sm text-neutral-800 dark:text-neutral-100">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    value="5x5"
                    defaultChecked
                    className="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>5x5</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    value="8x8"
                    className="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>8x8</span>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Формат турнира
              </legend>
              <div className="space-y-2 text-sm text-neutral-800 dark:text-neutral-100">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    value="single_elimination"
                    defaultChecked
                    className="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Single Elimination</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    value="round_robin"
                    className="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Round Robin</span>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="max_teams"
                className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100"
              >
                Максимум команд
              </label>
              <select
                id="max_teams"
                name="max_teams"
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none ring-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                defaultValue="16"
              >
                <option value="8">8</option>
                <option value="16">16</option>
                <option value="32">32</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="start_date"
                className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100"
              >
                Дата начала<span className="text-red-500">*</span>
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                required
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none ring-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="prize_pool"
                className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100"
              >
                Призовой фонд (₽, необязательно)
              </label>
              <input
                id="prize_pool"
                name="prize_pool"
                type="number"
                min="0"
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none ring-0 placeholder:text-neutral-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                placeholder="Например: 10000"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100"
            >
              Описание (необязательно)
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none ring-0 placeholder:text-neutral-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="Кратко опишите формат, правила и требования к участникам."
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-neutral-900 sm:w-auto"
            >
              {submitting ? "Создание..." : "Создать турнир"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

