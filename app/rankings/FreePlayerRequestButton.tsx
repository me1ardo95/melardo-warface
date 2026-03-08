"use client";

import { useState } from "react";

type Props = {
  isCurrentUser: boolean;
};

export default function FreePlayerRequestButton({ isCurrentUser }: Props) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isCurrentUser) return null;

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error ?? "Не удалось отправить заявку");
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || sent}
      className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {sent ? "Заявка отправлена" : loading ? "Отправка…" : "Отправить запрос"}
    </button>
  );
}

