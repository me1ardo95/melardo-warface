"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

type Props = { teamId: string };

export default function TeamInviteForm({ teamId }: Props) {
  const [userNick, setUserNick] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const nick = userNick.trim();
    if (!nick) {
      setError("Введите ник игрока");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, userNick: nick }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Не удалось отправить приглашение");
        return;
      }
      setSuccess(true);
      setUserNick("");
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
      <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Управление составом
      </h2>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <label
            htmlFor="invite-nick"
            className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >
            Ник игрока
          </label>
          <input
            id="invite-nick"
            type="text"
            value={userNick}
            onChange={(e) => setUserNick(e.target.value)}
            placeholder="Ник в Warface игрока"
            className={inputClass}
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-neutral-900"
        >
          {isSubmitting ? "Отправка…" : "Пригласить"}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {success && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
          Приглашение отправлено.
        </p>
      )}
    </div>
  );
}
