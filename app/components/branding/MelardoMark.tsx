// app/components/branding/MelardoMark.tsx
import * as React from "react";

type MelardoMarkProps = {
  className?: string;
};

export function MelardoMark({ className }: MelardoMarkProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-label="Melardo mark"
      className={className}
    >
      <defs>
        <linearGradient id="melardo-mark-white" x1="18" y1="18" x2="78" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#F5F7FB" />
          <stop offset="1" stopColor="#C9D0DD" />
        </linearGradient>

        <linearGradient id="melardo-mark-red" x1="18" y1="58" x2="48" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF3B30" />
          <stop offset="0.55" stopColor="#FF4D2E" />
          <stop offset="1" stopColor="#FF1E1E" />
        </linearGradient>

        <filter id="melardo-mark-red-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M18 20L35.2 35.8L48 25.2L60.8 35.8L78 20V56H66V42.6L48 57.4L30 42.6V56H18V20Z"
        fill="url(#melardo-mark-white)"
      />

      <g filter="url(#melardo-mark-red-glow)">
        <path
          d="M18 56.5L48 82L78 56.5L48 69.8L18 56.5Z"
          fill="url(#melardo-mark-red)"
        />
      </g>
    </svg>
  );
}

export default MelardoMark;