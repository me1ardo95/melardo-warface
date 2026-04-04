"use client";

import { useId } from "react";

type MelardoMarkProps = {
  className?: string;
  title?: string;
};

/**
 * Компактная монограмма для свернутого sidebar: угловой шеврон + M, красный акцент снизу.
 */
export function MelardoMark({
  className,
  title = "MELARDO",
}: MelardoMarkProps) {
  const uid = useId().replace(/:/g, "");
  const accent = `melardoMarkAccent-${uid}`;

  return (
    <svg
      viewBox="0 0 44 44"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={accent} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#B91C1C" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>

      {/* Угловой шеврон (слева) */}
      <path
        fill="#F9FAFB"
        d="M4 36 L4 12 L11 6 L13 10 L9 15 L9 36 Z"
      />

      {/* Буква M */}
      <path
        fill="#F9FAFB"
        d="M15 10 L15 36 L21 36 L21 24 L27 32 L33 24 L33 36 L40 36 L40 10 L33 10 L27 19 L21 10 Z"
      />

      {/* Красный нижний акцент */}
      <path
        fill={`url(#${accent})`}
        d="M3 37 L41 37 L39 42 L5 42 Z"
      />
    </svg>
  );
}
