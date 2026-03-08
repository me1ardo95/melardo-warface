"use client";

import { useState } from "react";

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile/delete", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data?.error ??
            "Не удалось удалить аккаунт. Попробуйте позже или свяжитесь с поддержкой."
        );
        return;
      }
      window.location.href = "/login";
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-surface mt-6 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">
        Опасная зона
      </h2>
      <p className="mt-1 text-sm text-[#B0B8C5]">
        Удаление аккаунта необратимо. Все данные профиля и участие в командах
        будут безвозвратно удалены.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded-md border border-[#EF4444] px-4 py-2 text-sm font-medium text-[#EF4444] hover:bg-[#7F1D1D] hover:text-white"
      >
        Удалить аккаунт
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-[#2A2F3A] bg-[#11141A] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              Удалить аккаунт?
            </h3>
            <p className="mt-2 text-sm text-[#E5E7EB]">
              Вы уверены, что хотите удалить аккаунт? Это действие необратимо:
              профиль, участие в командах и связанные данные будут удалены.
            </p>
            {error && (
              <p className="mt-3 text-sm text-[#FCA5A5]">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="btn-outline text-sm"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={submitting}
                className="btn-primary bg-gradient-to-r from-[#EF4444] to-[#B91C1C] text-sm"
              >
                {submitting ? "Удаление..." : "Подтвердить удаление"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

