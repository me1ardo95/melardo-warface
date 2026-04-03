"use client";

import Link from "next/link";
import { MelardoLogo } from "@/app/components/branding/MelardoLogo";
import type { Profile } from "@/lib/types";

type LandingHeaderProps = {
  profile: Profile | null;
};

export function LandingHeader({ profile }: LandingHeaderProps) {
  const isAuthed = !!profile;

  return (
    <header className="sticky top-0 z-30 border-b border-[#2A2F3A] bg-[#07090C]/90 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="shrink-0 opacity-95 transition-opacity hover:opacity-100"
          aria-label="MELARDO"
          title="MELARDO"
        >
          <MelardoLogo className="h-9 w-auto max-w-[min(200px,42vw)] object-contain object-left" />
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-6 md:flex">
          <Link
            href="/tournaments"
            className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
          >
            Турниры
          </Link>
          <Link
            href="/rankings"
            className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
          >
            Рейтинги
          </Link>
          <Link
            href="/rules"
            className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
          >
            Правила
          </Link>
          <Link
            href="/support"
            className="text-xs uppercase tracking-wide text-[#F97316] hover:text-white"
          >
            Поддержать
          </Link>
        </div>

        <div className="flex items-center justify-end gap-3 min-w-0">
          {isAuthed ? (
            <Link
              href="/profile"
              className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
            >
              Профиль
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-primary text-xs uppercase tracking-wide">
                Вход
              </Link>
              <Link
                href="/register"
                className="btn-outline text-xs uppercase tracking-wide"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
