"use client";

import { useState, useEffect } from "react";
import { BackButton } from "@/app/components/BackButton";

type TeamOption = { id: string; name: string };

export default function CreateMatchPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [teams, setTeams] = useState<TeamOption[]>([]);

  useEffect(() => {
    fetch("/api/team/my-teams")
      .then((r) => r.json())
      .then((data) => setTeams(data.teams ?? []))
      .catch(() => setTeams([]));
  }, []);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event
  ) => {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      teamId: String(formData.get("myTeam") || "").trim(),
      mode: String(formData.get("mode") || "5x5"),
      comment: String(formData.get("comment") || "").trim() || undefined,
    };

    if (!payload.teamId) {
      setMessage("Выберите команду, от имени которой бросаете вызов.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/challenge/public/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(
          data?.error ??
            "Не удалось создать публичный вызов. Попробуйте позже."
        );
        setSubmitting(false);
        return;
      }
      setMessage(
        "Вызов опубликован! Другие команды увидят его на странице «Вызовы»."
      );
      form.reset();
    } catch {
      setMessage("Ошибка сети. Попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card-surface mx-auto max-w-xl p-6 sm:p-8">
        <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
          Создать публичный вызов
        </h1>
        <p className="mt-2 text-sm text-[#B0B8C5]">
          Ваша команда объявляет о готовности играть. Любая другая команда
          сможет принять вызов на странице &quot;Вызовы&quot;.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="myTeam"
              className="mb-1 block text-sm font-medium text-[#E5E7EB]"
            >
              Ваша команда
            </label>
            <select
              id="myTeam"
              name="myTeam"
              className="w-full rounded-md border border-[#2A2F3A] bg-[#11141A] px-3 py-2 text-sm text-white placeholder-[#6B7280] focus:border-[#E63946] focus:outline-none focus:ring-1 focus:ring-[#E63946]"
            >
              <option value="">— Выберите команду —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="mode"
              className="mb-1 block text-sm font-medium text-[#E5E7EB]"
            >
              Режим
            </label>
            <select
              id="mode"
              name="mode"
              className="w-full rounded-md border border-[#2A2F3A] bg-[#11141A] px-3 py-2 text-sm text-white focus:border-[#E63946] focus:outline-none focus:ring-1 focus:ring-[#E63946]"
            >
              <option value="5x5">5x5</option>
              <option value="8x8">8x8</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="comment"
              className="mb-1 block text-sm font-medium text-[#E5E7EB]"
            >
              Комментарий (необязательно)
            </label>
            <textarea
              id="comment"
              name="comment"
              rows={3}
              className="w-full rounded-md border border-[#2A2F3A] bg-[#11141A] px-3 py-2 text-sm text-white placeholder-[#6B7280] focus:border-[#E63946] focus:outline-none focus:ring-1 focus:ring-[#E63946]"
              placeholder="Например: формат BO3, сервер EU, желаемое время по МСК"
            />
          </div>
          {message && (
            <p className="text-sm text-[#9CA3AF]">{message}</p>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn-primary text-sm uppercase tracking-wide disabled:opacity-60"
            >
              {submitting ? "Публикация..." : "Создать вызов"}
            </button>
            <BackButton className="flex-1 btn-outline text-center text-sm uppercase tracking-wide">
              Назад к списку
            </BackButton>
          </div>
        </form>
      </div>
    </div>
  );
}
