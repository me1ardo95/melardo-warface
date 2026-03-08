"use client";

import { useRouter } from "next/navigation";

type Props = {
  children?: React.ReactNode;
  className?: string;
};

export function BackButton({
  children = "← Назад",
  className,
}: Props) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={className}
    >
      {children}
    </button>
  );
}
