"use client";

import { useId } from "react";

type MelardoMarkProps = {
  className?: string;
  title?: string;
};

/**
 * Угловая монограмма M для свёрнутого sidebar: одна буква, острые грани, красный акцент снизу.
 */
export function MelardoMark({
  className,
  title = "MELARDO",
}: MelardoMarkProps) {
  const uid = useId().replace(/:/g, "");
  const accent = `melardoMarkAccent-${uid}`;

  return (
    <svg
      viewBox="0 0 40 44"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={accent} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#991B1B" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
      </defs>

      {/* Угловая M: срез слева сверху, острый «клык», без второй буквы */}
      <path
        fill="#F9FAFB"
        d="M6 34 L6 12 L10 6 L16 6 L20 16 L26 6 L34 6 L34 34 L26 34 L26 14 L20 22 L14 14 L14 34 Z"
      />

      <path
        fill={`url(#${accent})`}
        d="M5 35 L35 35 L33 40 L7 40 Z"
      />
    </svg>
  );
}
