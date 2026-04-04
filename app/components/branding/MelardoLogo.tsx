"use client";

import { useId } from "react";

type MelardoLogoProps = {
  className?: string;
  title?: string;
};

/**
 * Wordmark MELARDO (SVG): плотная типографика, красный акцент на центральных буквах LA, без неона.
 */
export function MelardoLogo({
  className,
  title = "MELARDO",
}: MelardoLogoProps) {
  const uid = useId().replace(/:/g, "");
  const letterAccent = `melardoLetterAccent-${uid}`;
  const underlineGrad = `melardoUnderline-${uid}`;

  return (
    <svg
      viewBox="0 0 520 92"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={letterAccent} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FECACA" />
          <stop offset="40%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
        <linearGradient id={underlineGrad} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#DC2626" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#EF4444" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#DC2626" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      <text
        x="260"
        y="58"
        textAnchor="middle"
        fill="#F4F4F5"
        fontSize="50"
        fontWeight="900"
        letterSpacing="0.2em"
        paintOrder="stroke fill"
        stroke="#0B0F14"
        strokeWidth="0.75"
        strokeOpacity="0.35"
        style={{
          fontFamily: '"Arial Black", "Helvetica Neue", system-ui, sans-serif',
          textTransform: "uppercase",
          textRendering: "geometricPrecision",
        }}
      >
        <tspan>ME</tspan>
        <tspan fill={`url(#${letterAccent})`} stroke="none">
          LA
        </tspan>
        <tspan>RDO</tspan>
      </text>

      <path
        d="M 44 74 L 476 74"
        fill="none"
        stroke={`url(#${underlineGrad})`}
        strokeWidth="2.25"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
