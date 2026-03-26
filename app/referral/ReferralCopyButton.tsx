"use client";

import { useState } from "react";

export default function ReferralCopyButton({
  referralLink,
}: {
  referralLink: string;
}) {
  const [isCopying, setIsCopying] = useState(false);

  return (
    <button
      type="button"
      disabled={isCopying}
      onClick={async () => {
        if (!referralLink) return;
        if (isCopying) return;
        try {
          setIsCopying(true);
          await navigator.clipboard.writeText(referralLink);
          alert("Ссылка скопирована в буфер обмена");
        } finally {
          setIsCopying(false);
        }
      }}
      className="whitespace-nowrap rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-70"
    >
      Скопировать
    </button>
  );
}

