"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateDailyTournamentButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 16);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") || "").trim();
    const startTime = String(fd.get("start_time") || "").trim();
    const maxTeams = Number(fd.get("max_teams") || 16);
    const entryFee = Number(fd.get("entry_fee") || 0);

    if (!title) {
      setError("Укажите название турнира");
      setSubmitting(false);
      return;
    }
    if (!startTime) {
      setError("Укажите время старта");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/scheduled-tournaments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startTime,
          maxTeams: [8, 16, 32].includes(maxTeams) ? maxTeams : 16,
          entryFee: entryFee >= 0 ? entryFee : 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Ошибка создания");
        setSubmitting(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
      >
        ⚡ Create Daily Tournament
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Ежедневный турнир
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Название
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="Warface Daily Cup"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Время старта
                </label>
                <input
                  name="start_time"
                  type="datetime-local"
                  required
                  defaultValue={defaultDate}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Команд
                </label>
                <select
                  name="max_teams"
                  defaultValue="16"
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  <option value="8">8</option>
                  <option value="16">16</option>
                  <option value="32">32</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Стоимость участия (₽)
                </label>
                <input
                  name="entry_fee"
                  type="number"
                  min="0"
                  defaultValue="0"
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-600"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? "Создание…" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
