"use client";

import { useId } from "react";

type MelardoLogoProps = {
  className?: string;
  title?: string;
};

/**
 * Wordmark MELARDO для раскрытого sidebar / шапки: светлая база, красный акцент на центральной букве, лёгкий премиальный glow.
 */
export function MelardoLogo({
  className,
  title = "MELARDO",
}: MelardoLogoProps) {
  const uid = useId().replace(/:/g, "");
  const letterAccent = `melardoLetterAccent-${uid}`;
  const underlineGrad = `melardoUnderline-${uid}`;
  const softGlow = `melardoSoftGlow-${uid}`;

  return (
    <svg
      viewBox="0 0 520 100"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={letterAccent} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FCA5A5" />
          <stop offset="45%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
        <linearGradient id={underlineGrad} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.35" />
          <stop offset="35%" stopColor="#DC2626" stopOpacity="1" />
          <stop offset="65%" stopColor="#DC2626" stopOpacity="1" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="0.35" />
        </linearGradient>
        <filter id={softGlow} x="-8%" y="-35%" width="116%" height="185%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="b" />
          <feFlood floodColor="#FFFFFF" floodOpacity="0.28" result="f" />
          <feComposite in="f" in2="b" operator="in" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${softGlow})`}>
        <text
          x="260"
          y="62"
          textAnchor="middle"
          fill="#F9FAFB"
          fontSize="54"
          fontWeight="900"
          letterSpacing="14"
          style={{
            fontFamily: '"Arial Black", "Inter", system-ui, sans-serif',
            textTransform: "uppercase",
          }}
        >
          <tspan>MEL</tspan>
          <tspan fill={`url(#${letterAccent})`}>A</tspan>
          <tspan fill="#F9FAFB">RDO</tspan>
        </text>
      </g>

      <path
        d="M 48 78 L 472 78"
        fill="none"
        stroke={`url(#${underlineGrad})`}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.95"
      />
    </svg>
  );
}
