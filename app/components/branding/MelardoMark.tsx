"use client";

import { useId } from "react";

type MelardoMarkProps = {
  className?: string;
  title?: string;
};

/**
 * Монограмма M как на референсе: острый «рог» слева сверху, глубокая впадина, красное свечение снизу.
 */
export function MelardoMark({ className, title = "MELARDO" }: MelardoMarkProps) {
  const uid = useId().replace(/:/g, "");
  const metal = `mm-metal-${uid}`;
  const red = `mm-red-${uid}`;
  const glow = `mm-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 48 52"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={metal} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#E4E6EB" />
          <stop offset="100%" stopColor="#9CA3AF" />
        </linearGradient>
        <linearGradient id={red} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FF6B35" />
          <stop offset="55%" stopColor="#FF3B1F" />
          <stop offset="100%" stopColor="#C41E12" />
        </linearGradient>
        <filter id={glow} x="-40%" y="-30%" width="180%" height="200%">
          <feGaussianBlur stdDeviation="1.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        fill={`url(#${metal})`}
        d="M6 42 L6 14 L3 10 L10 4 L16 8 L24 22 L32 8 L38 4 L45 10 L42 14 L42 42 L32 42 L32 20 L24 32 L16 20 L16 42 Z"
      />

      <g filter={`url(#${glow})`}>
        <path
          fill={`url(#${red})`}
          d="M8 40 L24 50 L40 40 L24 46 Z"
        />
      </g>
    </svg>
  );
}

export default MelardoMark;
