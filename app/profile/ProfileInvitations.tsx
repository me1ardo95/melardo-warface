"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Team } from "@/lib/types";

type Invitation = {
  id: string;
  team_id: string;
  status: string;
  team?: Team | null;
};

type Props = { invitations: Invitation[] };

export default function ProfileInvitations({ invitations }: Props) {
  const router = useRouter();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = async (invitationId: string, status: "accepted" | "declined") => {
    setError(null);
    setRespondingId(invitationId);
    try {
      const res = await fetch("/api/team/respond-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Не удалось обработать приглашение");
        return;
      }
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
    } finally {
      setRespondingId(null);
    }
  };

  if (invitations.length === 0) return null;

  return (
    <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-700">
      <h2 className="text-base font-medium text-neutral-700 dark:text-neutral-300">
        Входящие приглашения в команды
      </h2>
      <ul className="mt-3 space-y-3">
        {invitations.map((inv) => (
          <li
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50"
          >
            <div className="flex items-center gap-3 min-w-0">
              {inv.team?.logo_url ? (
                <img
                  src={inv.team.logo_url}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
                  {inv.team?.name?.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}
              <div className="min-w-0">
                <Link
                  href={`/teams/${inv.team_id}`}
                  className="font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                >
                  {inv.team?.name ?? "Команда"}
                </Link>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => respond(inv.id, "accepted")}
                disabled={respondingId !== null}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-neutral-900"
              >
                {respondingId === inv.id ? "…" : "Принять"}
              </button>
              <button
                type="button"
                onClick={() => respond(inv.id, "declined")}
                disabled={respondingId !== null}
                className="rounded-md bg-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 disabled:opacity-50 dark:bg-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-500 dark:focus:ring-offset-neutral-900"
              >
                {respondingId === inv.id ? "…" : "Отклонить"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
