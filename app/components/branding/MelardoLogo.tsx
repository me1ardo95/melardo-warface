"use client";

import { useId } from "react";

type MelardoLogoProps = {
  className?: string;
  title?: string;
};

/**
 * Wordmark MELARDO в духе референса: металлические буквы, наклон, оранжево-красная «A» со врезом, линия-свечение снизу.
 */
export function MelardoLogo({ className, title = "MELARDO" }: MelardoLogoProps) {
  const uid = useId().replace(/:/g, "");
  const metal = `ml-metal-${uid}`;
  const redA = `ml-redA-${uid}`;
  const under = `ml-under-${uid}`;
  const aGlow = `ml-aGlow-${uid}`;
  const underGlow = `ml-underGlow-${uid}`;

  return (
    <svg
      viewBox="0 0 440 96"
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
          <stop offset="22%" stopColor="#E8EAED" />
          <stop offset="45%" stopColor="#B8BCC4" />
          <stop offset="72%" stopColor="#8E939E" />
          <stop offset="100%" stopColor="#6B6F7A" />
        </linearGradient>
        <linearGradient id={redA} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFB14A" />
          <stop offset="35%" stopColor="#FF6B35" />
          <stop offset="70%" stopColor="#FF3B1F" />
          <stop offset="100%" stopColor="#D62816" />
        </linearGradient>
        <linearGradient id={under} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#FF4500" stopOpacity="0.15" />
          <stop offset="38%" stopColor="#FF6B35" stopOpacity="0.55" />
          <stop offset="50%" stopColor="#FF9A6B" stopOpacity="1" />
          <stop offset="62%" stopColor="#FF6B35" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FF4500" stopOpacity="0.15" />
        </linearGradient>
        <filter id={aGlow} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={underGlow} x="-15%" y="-250%" width="130%" height="600%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform="skewX(-10) translate(14 0)">
        {/* Лёгкий «объём» — сдвиг тени */}
        <text
          x="2"
          y="62"
          fill="#1a1a1a"
          fillOpacity="0.55"
          fontSize="54"
          fontWeight="900"
          fontFamily="Arial Black, Impact, Helvetica Neue, Arial, sans-serif"
          letterSpacing="-3"
        >
          MEL
        </text>
        <text
          x="2"
          y="62"
          fill={`url(#${metal})`}
          fontSize="54"
          fontWeight="900"
          fontFamily="Arial Black, Impact, Helvetica Neue, Arial, sans-serif"
          letterSpacing="-3"
        >
          MEL
        </text>

        {/* A — треугольник с горизонтальным вырезом (как на референсе) */}
        <g transform="translate(118 0)" filter={`url(#${aGlow})`}>
          <path
            fill={`url(#${redA})`}
            fillRule="evenodd"
            d="M 29 8 L 54 64 L 45 64 L 38 46 L 20 46 L 13 64 L 4 64 L 29 8 Z M 29 32 L 35 40 L 23 40 Z"
          />
        </g>

        <text
          x="184"
          y="62"
          fill="#1a1a1a"
          fillOpacity="0.55"
          fontSize="54"
          fontWeight="900"
          fontFamily="Arial Black, Impact, Helvetica Neue, Arial, sans-serif"
          letterSpacing="-3"
        >
          RDO
        </text>
        <text
          x="184"
          y="62"
          fill={`url(#${metal})`}
          fontSize="54"
          fontWeight="900"
          fontFamily="Arial Black, Impact, Helvetica Neue, Arial, sans-serif"
          letterSpacing="-3"
        >
          RDO
        </text>
      </g>

      <g filter={`url(#${underGlow})`}>
        <line
          x1="24"
          y1="78"
          x2="416"
          y2="78"
          stroke={`url(#${under})`}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="190"
          y1="78"
          x2="250"
          y2="78"
          stroke="#FFAB7A"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.85"
        />
      </g>
    </svg>
  );
}

export default MelardoLogo;
