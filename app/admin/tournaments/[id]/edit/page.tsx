"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AdminNav } from "@/app/admin/AdminNav";

type Tournament = {
  id: string;
  name: string;
  game: string | null;
  format?: string | null;
  max_teams?: number | null;
  start_date: string | null;
  end_date: string | null;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  prize_pool?: number | null;
  description?: string | null;
};

export default function AdminTournamentEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/tournaments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setTournament(data);
      })
      .catch(() => setTournament(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!tournament) return;
    setError(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      mode: String(formData.get("mode") || "5x5"),
      format: String(formData.get("format") || "single_elimination"),
      maxTeams: Number(formData.get("max_teams") || 8),
      startDate: String(formData.get("start_date") || "").trim(),
      endDate: String(formData.get("end_date") || "").trim() || null,
      status: String(formData.get("status") || "upcoming") as Tournament["status"],
      prizePoolRaw: String(formData.get("prize_pool") || "").trim(),
      description: String(formData.get("description") || "").trim() || null,
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

    const prizePool =
      payload.prizePoolRaw && !Number.isNaN(Number(payload.prizePoolRaw))
        ? Number(payload.prizePoolRaw)
        : null;

    try {
      const res = await fetch(`/api/admin/tournaments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          mode: payload.mode,
          format: payload.format,
          maxTeams: payload.maxTeams,
          startDate: payload.startDate,
          endDate: payload.endDate,
          status: payload.status,
          prizePool,
          description: payload.description,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError((data as { error?: string })?.error ?? "Не удалось обновить турнир.");
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

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-6 sm:px-6">
        <AdminNav active="tournaments" />
        <div className="mx-auto max-w-3xl">
          <p className="text-neutral-500 dark:text-neutral-400">Загрузка…</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen px-4 py-6 sm:px-6">
        <AdminNav active="tournaments" />
        <div className="mx-auto max-w-3xl">
          <p className="text-red-500">Турнир не найден.</p>
          <Link href="/admin/tournaments" className="mt-2 inline-block text-blue-600 hover:underline dark:text-blue-400">
            ← Назад к турнирам
          </Link>
        </div>
      </div>
    );
  }

  const startDateValue = tournament.start_date
    ? tournament.start_date.slice(0, 10)
    : "";
  const endDateValue = tournament.end_date
    ? tournament.end_date.slice(0, 10)
    : "";

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <AdminNav active="tournaments" />
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Редактировать турнир
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
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">
              Название турнира<span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={tournament.name}
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none ring-0 placeholder:text-neutral-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Режим игры
              </legend>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="mode" value="5x5" defaultChecked={tournament.game === "5x5"} className="h-4 w-4" />
                  <span>5x5</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="mode" value="8x8" defaultChecked={tournament.game === "8x8"} className="h-4 w-4" />
                  <span>8x8</span>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Формат
              </legend>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="format" value="single_elimination" defaultChecked={tournament.format === "single_elimination"} className="h-4 w-4" />
                  <span>Олимпийская система</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="format" value="round_robin" defaultChecked={tournament.format === "round_robin"} className="h-4 w-4" />
                  <span>Круговая система</span>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="max_teams" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Максимум команд
              </label>
              <select
                id="max_teams"
                name="max_teams"
                defaultValue={String(tournament.max_teams ?? 16)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              >
                <option value="8">8</option>
                <option value="16">16</option>
                <option value="32">32</option>
              </select>
            </div>
            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Статус
              </label>
              <select
                id="status"
                name="status"
                defaultValue={tournament.status}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              >
                <option value="upcoming">Регистрация</option>
                <option value="ongoing">Идёт</option>
                <option value="completed">Завершён</option>
                <option value="cancelled">Отменён</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="start_date" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Дата начала<span className="text-red-500">*</span>
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                required
                defaultValue={startDateValue}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Дата окончания
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                defaultValue={endDateValue}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prize_pool" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">
              Призовой фонд (₽)
            </label>
            <input
              id="prize_pool"
              name="prize_pool"
              type="number"
              min="0"
              defaultValue={tournament.prize_pool ?? ""}
              placeholder="10000"
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={tournament.description ?? ""}
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 sm:justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
