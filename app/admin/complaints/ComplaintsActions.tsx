"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  complaintId: string;
  status: string;
};

export function ComplaintsActions({ complaintId, status }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const resolve = async (action: "accept" | "reject") => {
    setLoading(action);
    try {
      const res = await fetch("/api/complaint/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaint_id: complaintId, action }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        onClick={() => resolve("accept")}
        disabled={!!loading}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading === "accept" ? "…" : "Принять"}
      </button>
      <button
        type="button"
        onClick={() => resolve("reject")}
        disabled={!!loading}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-60"
      >
        {loading === "reject" ? "…" : "Отклонить"}
      </button>
    </div>
  );
}
