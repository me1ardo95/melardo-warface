"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveClan } from "@/app/actions/clans";

type Props = { clanId: string; className?: string };

export default function LeaveClanButton({ clanId, className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLeave() {
    if (!confirm("Вы уверены, что хотите покинуть клан?")) return;
    setLoading(true);
    const result = await leaveClan(clanId);
    setLoading(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.push("/clans");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLeave}
      disabled={loading}
      className={`btn-outline text-sm ${className ?? ""}`}
    >
      {loading ? "Выход..." : "Покинуть клан"}
    </button>
  );
}
