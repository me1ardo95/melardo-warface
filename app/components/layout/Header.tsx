"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/app/actions/auth";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUserAndRole() {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);

      if (u) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", u.id)
          .limit(1);

        const role = profiles && profiles.length > 0 ? profiles[0]?.role : null;
        setIsAdmin(role === "admin");
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    }

    loadUserAndRole();
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  if (loading) {
    return (
      <header className="border-b border-[#2A2F3A] bg-[#07090C]/80 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-full skeleton" />
            <div className="h-5 w-32 animate-pulse rounded skeleton" />
          </div>
          <div className="h-9 w-24 animate-pulse rounded skeleton" />
        </nav>
      </header>
    );
  }

  return (
    <header className="border-b border-[#2A2F3A] bg-[#07090C]/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="font-bold tracking-[0.18em] text-sm text-white hover:text-[#F97316] [font-family:var(--font-display-primary)]"
            onClick={closeMobileMenu}
          >
            MELARDO WARFACE
          </Link>
          {user && (
            <div className="hidden items-center gap-4 md:flex">
              <Link
                href="/"
                className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
              >
                Главная
              </Link>
              <Link
                href="/profile"
                className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
              >
                Профиль
              </Link>
              <Link
                href="/teams"
                className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
              >
                Команды
              </Link>
              <Link
                href="/clans"
                className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
              >
                Кланы
              </Link>
              <Link
                href="/matches"
                className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
              >
                Вызовы
              </Link>
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
                href="/leaderboard"
                className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
              >
                Таблица лидеров
              </Link>
              <Link
                href="/missions"
                className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
              >
                Миссии
              </Link>
              <Link
                href="/season"
                className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
              >
                Сезон
              </Link>
              <Link
                href="/stats"
                className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
              >
                Статистика
              </Link>
              <Link
                href="/quick-match"
                className="text-xs uppercase tracking-wide text-[#F97316] hover:text-white"
              >
                Быстрый матч
              </Link>
              <Link
                href="/rules"
                className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
              >
                Правила
              </Link>
              <Link
                href="/guide"
                className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
              >
                Руководство
              </Link>
              <Link
                href="/support"
                className="text-xs uppercase tracking-wide text-[#F97316] hover:text-white"
              >
                Поддержать проект
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-xs uppercase tracking-wide text-[#FBBF24] hover:text-white"
                >
                  Админка
                </Link>
              )}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-[#374151] px-3 py-2 text-sm font-medium text-[#E5E7EB] hover:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316] md:hidden"
                aria-label="Открыть меню"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
              >
                ☰
              </button>
              <form action={signOut} className="hidden md:block">
                <button
                  type="submit"
                  className="btn-outline text-xs uppercase tracking-wide"
                >
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="btn-primary text-xs uppercase tracking-wide"
              >
                Вход
              </Link>
              <Link
                href="/register"
                className="btn-outline text-xs uppercase tracking-wide"
              >
                Регистрация
              </Link>
              <Link
                href="/support"
                className="hidden sm:inline-flex btn-primary text-xs uppercase tracking-wide"
              >
                Поддержать
              </Link>
            </>
          )}
        </div>
      </nav>

      {user && isMobileMenuOpen && (
        <div className="border-t border-[#2A2F3A] bg-[#020617] px-4 py-3 md:hidden">
          <nav className="mx-auto flex max-w-5xl flex-col gap-1 text-sm">
            <Link
              href="/"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#E5E7EB] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Главная
            </Link>
            <Link
              href="/profile"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#E5E7EB] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Профиль
            </Link>
            <Link
              href="/teams"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#E5E7EB] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Команды
            </Link>
            <Link
              href="/clans"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#E5E7EB] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Кланы
            </Link>
            <Link
              href="/matches"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#E5E7EB] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Вызовы
            </Link>
            <Link
              href="/tournaments"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#E5E7EB] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Турниры
            </Link>
            <Link
              href="/rankings"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#E5E7EB] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Рейтинги
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#E5E7EB] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Таблица лидеров
            </Link>
            <Link
              href="/missions"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#E5E7EB] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Миссии
            </Link>
            <Link
              href="/season"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#E5E7EB] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Сезон
            </Link>
            <Link
              href="/stats"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#E5E7EB] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Статистика
            </Link>
            <Link
              href="/quick-match"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#F97316] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Быстрый матч
            </Link>
            <Link
              href="/rules"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#E5E7EB] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Правила
            </Link>
            <Link
              href="/guide"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#E5E7EB] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Руководство
            </Link>
            <Link
              href="/support"
              className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#F97316] hover:bg-[#111827]"
              onClick={closeMobileMenu}
            >
              Поддержать проект
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-md px-3 py-2 text-xs uppercase tracking-wide text-[#FBBF24] hover:bg-[#111827]"
                onClick={closeMobileMenu}
              >
                Админка
              </Link>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="mt-1 w-full rounded-md px-3 py-2 text-left text-xs uppercase tracking-wide text-[#F97316] hover:bg-[#111827]"
                onClick={closeMobileMenu}
              >
                Выйти
              </button>
            </form>
          </nav>
        </div>
      )}
    </header>
  );
}
