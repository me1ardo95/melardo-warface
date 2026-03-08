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
        <div className="flex flex-wrap items-center gap-5">
          <Link
            href="/"
            className="font-bold tracking-[0.18em] text-sm text-white hover:text-[#F97316] [font-family:var(--font-display-primary)]"
          >
            MELARDO WARFACE
          </Link>
          {user ? (
            <>
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
            </>
          ) : (
            <>
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
                className="text-xs uppercase tracking-wide text-[#B0B8C5] hover:text-white"
              >
                Поддержка
              </Link>
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <form action={signOut}>
              <button
                type="submit"
                className="btn-outline text-xs uppercase tracking-wide"
              >
                Выйти
              </button>
            </form>
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
    </header>
  );
}
