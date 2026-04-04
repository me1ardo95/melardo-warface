// app/components/branding/MelardoLogo.tsx
import * as React from "react";

type MelardoLogoProps = {
  className?: string;
};

export function MelardoLogo({ className }: MelardoLogoProps) {
  return (
    <svg
      viewBox="0 0 520 130"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Melardo logo"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="melardo-metal" x1="34" y1="10" x2="454" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFF6F1" />
          <stop offset="0.12" stopColor="#FFFFFF" />
          <stop offset="0.28" stopColor="#EEF1F7" />
          <stop offset="0.5" stopColor="#D5DBE7" />
          <stop offset="0.73" stopColor="#B8C0CE" />
          <stop offset="1" stopColor="#909AAD" />
        </linearGradient>

        <linearGradient id="melardo-metal-shadow" x1="90" y1="38" x2="440" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.42" stopColor="#B7BFCC" stopOpacity="0.06" />
          <stop offset="0.72" stopColor="#7A8496" stopOpacity="0.22" />
          <stop offset="1" stopColor="#5B6476" stopOpacity="0.5" />
        </linearGradient>

        <linearGradient id="melardo-red" x1="214" y1="12" x2="252" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF5445" />
          <stop offset="0.24" stopColor="#FF3A2F" />
          <stop offset="0.55" stopColor="#F62620" />
          <stop offset="1" stopColor="#B81614" />
        </linearGradient>

        <linearGradient id="melardo-red-shadow" x1="218" y1="40" x2="252" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.5" stopColor="#A10E10" stopOpacity="0.12" />
          <stop offset="1" stopColor="#6F0909" stopOpacity="0.34" />
        </linearGradient>

        <linearGradient id="melardo-line-red" x1="8" y1="18" x2="486" y2="18" gradientUnits="userSpaceOnUse">
  <stop offset="0" stopColor="#FF2A22" stopOpacity="0.15" />
  <stop offset="0.2" stopColor="#FF2A22" stopOpacity="0.55" />
  <stop offset="0.5" stopColor="#FF3B30" stopOpacity="1" />
  <stop offset="0.8" stopColor="#FF2A22" stopOpacity="0.55" />
  <stop offset="1" stopColor="#FF2A22" stopOpacity="0.15" />
</linearGradient>

<filter id="melardo-line-glow" x="-20%" y="-400%" width="160%" height="1000%">
  <feGaussianBlur stdDeviation="3.2" result="blur" />
  <feMerge>
    <feMergeNode in="blur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
      </defs>

      <g transform="translate(15 96) skewX(0)">
        <text
          x="0"
          y="0"
          fill="url(#melardo-metal)"
          fontSize="85"
          fontWeight="900"
          letterSpacing="0"
          fontStyle="normal"
          fontFamily="Inter, Arial Black, Arial, sans-serif"
        >
          MEL
        </text>
        <text
          x="0"
          y="0"
          fill="url(#melardo-metal-shadow)"
          fontSize="85"
          fontWeight="900"
          letterSpacing="0"
          fontStyle="normal"
          fontFamily="Inter, Arial Black, Arial, sans-serif"
        >
          MEL
        </text>

        <text
          x="185"
          y="0"
          fill="url(#melardo-red)"
          fontSize="120"
          fontWeight="900"
          letterSpacing="0"
          fontStyle="normal"
          fontFamily="Inter, Arial Black, Arial, sans-serif"
        >
          A
        </text>
        <text
          x="185"
          y="0"
          fill="url(#melardo-red-shadow)"
          fontSize="120"
          fontWeight="900"
          letterSpacing="0"
          fontStyle="normal"
          fontFamily="Inter, Arial Black, Arial, sans-serif"
        >
          A
        </text>

        <text
          x="285"
          y="0"
          fill="url(#melardo-metal)"
          fontSize="85"
          fontWeight="900"
          letterSpacing="0"
          fontStyle="normal"
          fontFamily="Inter, Arial Black, Arial, sans-serif"
        >
          RDO
        </text>
        <text
          x="285"
          y="0"
          fill="url(#melardo-metal-shadow)"
          fontSize="85"
          fontWeight="900"
          letterSpacing="0"
          fontStyle="normal"
          fontFamily="Inter, Arial Black, Arial, sans-serif"
        >
          RDO
        </text>

        <path
  d="M8 18H470"
  stroke="#FF2A22"
  strokeWidth="2.4"
  strokeLinecap="round"
/>
      </g>

      <g filter="url(#melardo-line-glow)">
  <path
    d="M8 18H505"
    stroke="url(#melardo-line-red)"
    strokeWidth="12.6"
    strokeLinecap="round"
  />
</g>
    </svg>
  );
}

export default MelardoLogo;