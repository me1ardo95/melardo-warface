"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamMemberWithProfile } from "@/app/actions/data";

type Props = {
  teamId: string;
  members: TeamMemberWithProfile[];
  currentUserId: string;
};

export default function TransferCaptainForm({
  teamId,
  members,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidates = members.filter((m) => m.user_id !== currentUserId);

  if (candidates.length === 0) {
    return (
      <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
        В команде нет других участников для передачи капитанства.
      </p>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/team/transfer-captain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          new_captain_user_id: selectedUserId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Не удалось передать капитанство");
        setLoading(false);
        return;
      }
      router.refresh();
      setSelectedUserId("");
    } catch {
      setError("Ошибка сети.");
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
      <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Передать капитанство
      </h2>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        После передачи вы станете обычным участником.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <label htmlFor="new_captain" className="sr-only">
            Новый капитан
          </label>
          <select
            id="new_captain"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            disabled={loading}
          >
            <option value="">Выберите участника</option>
            {candidates.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.warface_nick || m.display_name || m.user_id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading || !selectedUserId}
          className="rounded-md border border-amber-600 bg-white px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-amber-500 dark:bg-transparent dark:text-amber-400 dark:hover:bg-amber-900/20"
        >
          {loading ? "Отправка…" : "Передать капитанство"}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
