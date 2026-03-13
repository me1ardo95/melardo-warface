"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Home,
  User,
  Users,
  Swords,
  Trophy,
  Shield,
  BarChart3,
  Target,
  Calendar,
  LineChart,
  Zap,
  ScrollText,
  BookOpen,
  Heart,
  Wrench,
  LogOut,
  LogIn,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions/auth";

type NavLink = { label: string; href: string };

type NavGroup = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primaryHref: string;
  links: NavLink[];
  adminOnly?: boolean;
  authedOnly?: boolean;
  guestOnly?: boolean;
};

export function SupabaseSidebarNav() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasUser, setHasUser] = useState<boolean>(false);
  const [myTeamHref, setMyTeamHref] = useState<string>("/teams");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setHasUser(!!user);

      if (user) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .limit(1);
        setIsAdmin((profiles?.[0]?.role ?? null) === "admin");

        try {
          const res = await fetch("/api/team/my-teams");
          if (res.ok) {
            const data = (await res.json().catch(() => null)) as any;
            const first = Array.isArray(data?.teams) ? data.teams[0] : null;
            const id = first?.id ? String(first.id) : "";
            if (id) setMyTeamHref(`/teams/${encodeURIComponent(id)}`);
          }
        } catch {
          // не критично
        }
      } else {
        setIsAdmin(false);
        setMyTeamHref("/teams");
      }
    })();
  }, []);

  const groups = useMemo<NavGroup[]>(
    () => [
      {
        key: "home",
        icon: Home,
        label: "Главная",
        primaryHref: "/",
        links: [{ label: "Главная", href: "/" }],
      },
      {
        key: "profile",
        icon: User,
        label: "Профиль",
        primaryHref: "/profile",
        authedOnly: true,
        links: [
          { label: "Мой профиль", href: "/profile" },
          { label: "Настройки", href: "/profile/edit" },
        ],
      },
      {
        key: "auth",
        icon: LogIn,
        label: "Аккаунт",
        primaryHref: "/login",
        guestOnly: true,
        links: [
          { label: "Вход", href: "/login" },
          { label: "Регистрация", href: "/register" },
        ],
      },
      {
        key: "teams",
        icon: Users,
        label: "Команды",
        primaryHref: "/teams",
        authedOnly: true,
        links: [
          { label: "Моя команда", href: myTeamHref },
          { label: "Все команды", href: "/teams" },
          { label: "Создать команду", href: "/teams/create" },
        ],
      },
      {
        key: "matches",
        icon: Swords,
        label: "Вызовы",
        primaryHref: "/matches",
        authedOnly: true,
        links: [
          { label: "Активные вызовы", href: "/matches" },
          { label: "Мои матчи", href: "/matches?my=true" },
          { label: "Создать вызов", href: "/matches/create" },
        ],
      },
      {
        key: "tournaments",
        icon: Trophy,
        label: "Турниры",
        primaryHref: "/tournaments",
        authedOnly: true,
        links: [
          { label: "Активные турниры", href: "/tournaments" },
          { label: "Мои турниры", href: "/tournaments?my=true" },
          { label: "Запросить турнир", href: "/tournaments/request" },
        ],
      },
      {
        key: "clans",
        icon: Shield,
        label: "Кланы",
        primaryHref: "/clans",
        authedOnly: true,
        links: [
          { label: "Все кланы", href: "/clans" },
          { label: "Создать клан", href: "/clan/create" },
        ],
      },
      {
        key: "rankings",
        icon: BarChart3,
        label: "Рейтинги",
        primaryHref: "/rankings",
        links: [
          { label: "Команды", href: "/rankings?tab=teams" },
          { label: "Игроки", href: "/rankings?tab=players" },
          { label: "Таблица лидеров", href: "/leaderboard" },
        ],
      },
      {
        key: "missions",
        icon: Target,
        label: "Миссии",
        primaryHref: "/missions",
        authedOnly: true,
        links: [{ label: "Миссии", href: "/missions" }],
      },
      {
        key: "season",
        icon: Calendar,
        label: "Сезон",
        primaryHref: "/season",
        authedOnly: true,
        links: [
          { label: "Текущий сезон", href: "/season" },
          { label: "Архив", href: "/league/archive" },
        ],
      },
      {
        key: "stats",
        icon: LineChart,
        label: "Статистика",
        primaryHref: "/stats",
        authedOnly: true,
        links: [{ label: "Статистика", href: "/stats" }],
      },
      {
        key: "quick",
        icon: Zap,
        label: "Быстрый матч",
        primaryHref: "/quick-match",
        authedOnly: true,
        links: [{ label: "Поиск соперника", href: "/quick-match" }],
      },
      {
        key: "rules",
        icon: ScrollText,
        label: "Правила",
        primaryHref: "/rules",
        links: [{ label: "Правила платформы", href: "/rules" }],
      },
      {
        key: "guide",
        icon: BookOpen,
        label: "Руководство",
        primaryHref: "/guide",
        links: [{ label: "Как пользоваться", href: "/guide" }],
      },
      {
        key: "support",
        icon: Heart,
        label: "Поддержать проект",
        primaryHref: "/support",
        links: [{ label: "Донат", href: "/support" }],
      },
      {
        key: "admin",
        icon: Wrench,
        label: "Админка",
        primaryHref: "/admin",
        adminOnly: true,
        links: [
          { label: "Панель управления", href: "/admin" },
          { label: "Пользователи", href: "/admin/players" },
          { label: "Турниры", href: "/admin/tournaments" },
          { label: "Жалобы", href: "/admin/complaints" },
        ],
      },
    ],
    [myTeamHref]
  );

  const visibleGroups = useMemo(() => {
    return groups.filter((g) => {
      if (g.adminOnly && !isAdmin) return false;
      if (g.authedOnly && !hasUser) return false;
      if (g.guestOnly && hasUser) return false;
      return true;
    });
  }, [groups, hasUser, isAdmin]);

  return (
    <aside className="fixed left-0 top-0 z-40 h-dvh w-16 bg-[#0A0C0F]">
      <div className="h-20 border-b border-white/5">
        <Link
          href="/"
          className="flex h-full w-full items-center justify-center"
          aria-label="MELARDO WARFACE"
        >
          <div className="flex flex-col items-center justify-center leading-none">
            <img
              src="/melardo-warface-logo.png"
              alt="MELARDO WARFACE"
              className="h-10 w-10 object-contain"
            />
            <span className="mt-1 text-[9px] font-semibold tracking-[0.18em] text-white/90">
              MELARDO
            </span>
          </div>
        </Link>
      </div>

      <div className="h-[calc(100dvh-5rem)] overflow-y-auto py-2">
        <nav className="flex flex-col items-center gap-1 px-2">
          {visibleGroups.map((g) => {
            const Icon = g.icon;
            return (
              <div
                key={g.key}
                className="relative w-full"
              >
                <div className="group relative">
                  <Link
                    href={g.primaryHref}
                    className="flex h-10 w-full items-center justify-center rounded-md text-white/70 hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24B47E]"
                    aria-label={g.label}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>

                  <div className="pointer-events-none absolute left-[calc(100%+10px)] top-0">
                    <div className="pointer-events-auto w-[220px] origin-left translate-x-2 opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100 rounded-lg border border-white/10 bg-[#0B0F14] p-2 shadow-2xl shadow-black/40">
                      <div className="px-2 pb-1 pt-1 text-[11px] font-semibold tracking-wide text-white/60">
                        {g.label}
                      </div>
                      <div className="mt-1 space-y-1">
                        {g.links.map((l) => (
                          <Link
                            key={l.href + l.label}
                            href={l.href}
                            className="block rounded-md px-2 py-1.5 text-sm text-white/80 hover:bg-white/5 hover:text-white"
                          >
                            {l.label}
                          </Link>
                        ))}
                        {g.key === "auth" && (
                          <div className="hidden" aria-hidden="true">
                            <UserPlus className="h-0 w-0" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {hasUser && (
            <div className="relative mt-2 w-full px-2">
              <div className="h-px w-full bg-white/5" />
              <div className="group relative mt-2">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex h-10 w-full items-center justify-center rounded-md text-white/70 hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24B47E]"
                    aria-label="Выйти"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </form>

                <div className="pointer-events-none absolute left-[calc(100%+10px)] top-0">
                  <div className="pointer-events-auto w-[220px] origin-left translate-x-2 opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100 rounded-lg border border-white/10 bg-[#0B0F14] p-2 shadow-2xl shadow-black/40">
                    <div className="px-2 pb-1 pt-1 text-[11px] font-semibold tracking-wide text-white/60">
                      Аккаунт
                    </div>
                    <div className="mt-1 space-y-1">
                      <button
                        type="submit"
                        className="w-full rounded-md px-2 py-1.5 text-left text-sm text-white/80 hover:bg-white/5 hover:text-white"
                      >
                        Выйти
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}

