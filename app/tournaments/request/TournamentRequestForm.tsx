"use client";

import { useRef, useState } from "react";

export default function TournamentRequestForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const fairPlayAgreed = formData.get("fair_play") === "on";

    const minTeamsRaw = String(formData.get("min_teams") || "").trim();
    const maxTeamsRaw = String(formData.get("max_teams") || "").trim();

    const min_teams = minTeamsRaw ? Number(minTeamsRaw) : null;
    const max_teams = maxTeamsRaw ? Number(maxTeamsRaw) : null;

    const selectedFormat = String(formData.get("format") || "Single Elimination");
    const normalizedFormat =
      selectedFormat === "Round Robin" ? "round_robin" : "single_elimination";

    const payload = {
      title: String(formData.get("title") || "").trim(),
      mode: formData.get("mode") === "8x8" ? "8x8" : "5x5",
      format: normalizedFormat,
      min_teams,
      max_teams,
      requested_date: formData.get("requested_date") || null,
      comment: String(formData.get("comment") || "").trim() || null,
      fair_play_agreed: fairPlayAgreed,
    };

    if (!payload.title) {
      setError("Укажите название турнира");
      setSubmitting(false);
      return;
    }
    if (
      payload.min_teams === null ||
      payload.max_teams === null ||
      Number.isNaN(payload.min_teams) ||
      Number.isNaN(payload.max_teams)
    ) {
      setError("Укажите минимальное и максимальное количество команд.");
      setSubmitting(false);
      return;
    }
    if (
      payload.min_teams < 2 ||
      payload.max_teams < payload.min_teams ||
      payload.max_teams > 64
    ) {
      setError(
        "Диапазон команд должен быть от 2 до 64, при этом максимум не меньше минимума."
      );
      setSubmitting(false);
      return;
    }
    if (!fairPlayAgreed) {
      setError(
        "Необходимо подтвердить обязательство играть честно, чтобы отправить заявку."
      );
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/tournament/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Не удалось отправить заявку");
      }
      setSuccess("Заявка отправлена. Мы уведомим вас о решении.");
      formRef.current?.reset();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Произошла ошибка при отправке заявки"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {success}
        </p>
      )}

      <div>
        <label
          htmlFor="title"
          className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Название турнира
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          placeholder="Например: MELARDO WARFACE Cup"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Режим игры
        </legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              value="5x5"
              defaultChecked
              className="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
            />
            <span>5x5</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              value="8x8"
              className="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
            />
            <span>8x8</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Формат
        </legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="format"
              value="Single Elimination"
              defaultChecked
              className="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
            />
            <span>Олимпийская система</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="format"
              value="Round Robin"
              className="h-4 w-4 border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
            />
            <span>Круговая система</span>
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="min_teams"
            className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Минимум команд
          </label>
          <input
            id="min_teams"
            name="min_teams"
            type="number"
            min={2}
            max={64}
            defaultValue={8}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div>
          <label
            htmlFor="max_teams"
            className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Максимум команд
          </label>
          <input
            id="max_teams"
            name="max_teams"
            type="number"
            min={2}
            max={64}
            defaultValue={16}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="requested_date"
          className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Предполагаемая дата
        </label>
        <input
          id="requested_date"
          name="requested_date"
          type="date"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        />
      </div>

      <div>
        <label
          htmlFor="comment"
          className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Комментарий
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={4}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          placeholder="Опишите идею турнира, особенности формата, ограничения по рейтингу и т.п."
        />
      </div>

      <div className="space-y-2 rounded-md bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="fair_play"
            className="mt-0.5 h-4 w-4 shrink-0 border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-900"
            required
          />
          <span>
            Я и моя команда обязуемся играть честно. В случае использования
            читов или нарушения правил команда будет дисквалифицирована.
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 dark:focus:ring-offset-neutral-900"
      >
        {submitting ? "Отправка..." : "Отправить заявку"}
      </button>
    </form>
  );
}

