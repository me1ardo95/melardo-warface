"use client";

type MelardoLogoProps = {
  className?: string;
  title?: string;
};

export function MelardoLogo({
  className,
  title = "MELARDO WARFACE",
}: MelardoLogoProps) {
  return (
    <svg
      viewBox="0 0 360 120"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <text
        x="180"
        y="52"
        textAnchor="middle"
        fill="#F3F4F6"
        fontSize="52"
        fontWeight="900"
        letterSpacing="3"
        style={{ fontFamily: "Arial Black, Inter, sans-serif" }}
      >
        MELARDO
      </text>
      <text
        x="180"
        y="92"
        textAnchor="middle"
        fill="#F3F4F6"
        fontSize="38"
        fontWeight="900"
        letterSpacing="2"
        style={{ fontFamily: "Arial Black, Inter, sans-serif" }}
      >
        WARFACE
      </text>
      <line x1="30" y1="76" x2="72" y2="76" stroke="#F97316" strokeWidth="6" strokeLinecap="round" />
      <line x1="288" y1="76" x2="330" y2="76" stroke="#F97316" strokeWidth="6" strokeLinecap="round" />
      <path d="M110 108 L180 118 L250 108" fill="none" stroke="#F97316" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
