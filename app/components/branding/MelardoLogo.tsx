"use client";

import { useId } from "react";

type MelardoLogoProps = {
  className?: string;
  title?: string;
};

/**
 * Inline SVG wordmark — единый бренд MELARDO (без PNG).
 * Светлая типографика + красно-оранжевый акцент в стиле интерфейса (#E63946 / #F97316), мягкий glow.
 */
export function MelardoLogo({
  className,
  title = "MELARDO",
}: MelardoLogoProps) {
  const uid = useId().replace(/:/g, "");
  const wordFill = `melardoWordFill-${uid}`;
  const accentLine = `melardoAccentLine-${uid}`;
  const wordGlow = `melardoWordGlow-${uid}`;

  return (
    <svg
      viewBox="0 0 440 96"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={wordFill} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#F3F4F6" />
          <stop offset="100%" stopColor="#D1D5DB" />
        </linearGradient>
        <linearGradient id={accentLine} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#E63946" stopOpacity="1" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0.85" />
        </linearGradient>
        <filter id={wordGlow} x="-10%" y="-30%" width="120%" height="170%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="blur" />
          <feFlood floodColor="#FFFFFF" floodOpacity="0.4" result="glow" />
          <feComposite in="glow" in2="blur" operator="in" result="soft" />
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <text
        x="220"
        y="58"
        textAnchor="middle"
        fill={`url(#${wordFill})`}
        fontSize="52"
        fontWeight="900"
        letterSpacing="10"
        filter={`url(#${wordGlow})`}
        style={{
          fontFamily: '"Arial Black", Inter, system-ui, sans-serif',
          textTransform: "uppercase",
        }}
      >
        MELARDO
      </text>

      <path
        d="M 52 76 L 388 76"
        fill="none"
        stroke={`url(#${accentLine})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.92"
      />
    </svg>
  );
}
