"use client";

import { useState } from "react";

const REASONS = [
  { value: "wrong_result", label: "Неверный результат" },
  { value: "cheats", label: "Читы" },
  { value: "offensive", label: "Оскорбления" },
  { value: "fake_player", label: "Подставной игрок" },
  { value: "other", label: "Другое" },
] as const;

type Props = {
  matchId?: string;
  playerId?: string;
  teamId?: string;
  className?: string;
  children?: React.ReactNode;
};

export function ComplaintButton({
  matchId,
  playerId,
  teamId,
  className = "",
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const reason = formData.get("reason") as string;
    const description = formData.get("description") as string;
    const proof = formData.get("proof") as File | null;

    try {
      let proofUrl: string | null = null;
      if (proof?.size) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const extMap: Record<string, string> = {
          "image/png": "png",
          "image/jpeg": "jpg",
          "image/jpg": "jpg",
          "image/webp": "webp",
          "video/mp4": "mp4",
          "video/webm": "webm",
        };
        const ext = extMap[proof.type] ?? "bin";
        const path = `complaints/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("complaints")
          .upload(path, proof, { contentType: proof.type, upsert: false });
        if (!upErr) {
          proofUrl = supabase.storage.from("complaints").getPublicUrl(path).data.publicUrl;
        }
      }

      const res = await fetch("/api/complaint/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: REASONS.find((r) => r.value === reason)?.label ?? reason,
          reason: reason,
          description: description || null,
          proof_url: proofUrl,
          match_id: matchId || null,
          player_id: playerId || null,
          team_id: teamId || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? "Не удалось отправить жалобу" });
        return;
      }
      setMessage({ type: "success", text: "Жалоба отправлена. Мы рассмотрим её в ближайшее время." });
      form.reset();
      setTimeout(() => {
        setOpen(false);
        setMessage(null);
      }, 1500);
    } catch {
      setMessage({ type: "error", text: "Ошибка сети. Попробуйте позже." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        {children ?? "🚨 Жалоба"}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Отправить жалобу
            </h3>
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="complaint-reason"
                  className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Причина
                </label>
                <select
                  id="complaint-reason"
                  name="reason"
                  required
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="complaint-description"
                  className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Комментарий
                </label>
                <textarea
                  id="complaint-description"
                  name="description"
                  rows={3}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="Опишите ситуацию..."
                />
              </div>
              <div>
                <label
                  htmlFor="complaint-proof"
                  className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Прикрепить скриншот/видео (опционально)
                </label>
                <input
                  id="complaint-proof"
                  name="proof"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"
                  className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:text-neutral-300 dark:file:bg-neutral-800"
                />
              </div>
              {message && (
                <p
                  className={
                    message.type === "success"
                      ? "text-sm text-emerald-600 dark:text-emerald-400"
                      : "text-sm text-red-600 dark:text-red-400"
                  }
                >
                  {message.text}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => !loading && setOpen(false)}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {loading ? "Отправка…" : "Отправить жалобу"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
