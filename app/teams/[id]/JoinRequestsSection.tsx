"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamJoinRequestWithProfile } from "@/app/actions/data";

type Props = {
  teamId: string;
  requests: TeamJoinRequestWithProfile[];
};

export default function JoinRequestsSection({ teamId, requests }: Props) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (requests.length === 0) return null;

  const handle = async (requestId: string, action: "approve" | "reject") => {
    setProcessingId(requestId);
    setError(null);
    try {
      const res = await fetch("/api/team/handle-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, team_id: teamId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось обработать заявку");
        return;
      }
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
      <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Заявки на вступление
      </h2>
      <ul className="mt-3 space-y-3 text-sm">
        {requests.map((r) => {
          const name =
            r.profile.warface_nick ??
            r.profile.display_name ??
            "Игрок";
          return (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800/60"
            >
              <div className="flex items-center gap-3 min-w-0">
                {r.profile.avatar_url ? (
                  <img
                    src={r.profile.avatar_url}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                    {name}
                  </div>
                  {r.message && (
                    <div className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {r.message}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={processingId === r.id}
                  onClick={() => handle(r.id, "approve")}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-neutral-900"
                >
                  {processingId === r.id ? "…" : "Принять"}
                </button>
                <button
                  type="button"
                  disabled={processingId === r.id}
                  onClick={() => handle(r.id, "reject")}
                  className="rounded-md bg-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 disabled:opacity-50 dark:bg-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-500 dark:focus:ring-offset-neutral-900"
                >
                  {processingId === r.id ? "…" : "Отклонить"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

