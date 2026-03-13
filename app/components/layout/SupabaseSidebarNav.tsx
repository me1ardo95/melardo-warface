"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openPanel = (key: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setActiveKey(key);
  };

  const scheduleClosePanel = (key: string) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setActiveKey((prev) => (prev === key ? null : prev));
    }, 120);
  };

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
        ],
      },
      {
        key: "rules",
        icon: ScrollText,
        label: "Правила",
        primaryHref: "/rules",
        links: [{ label: "Правила", href: "/rules" }],
      },
      {
        key: "guide",
        icon: BookOpen,
        label: "Руководство",
        primaryHref: "/guide",
        links: [{ label: "Руководство", href: "/guide" }],
      },
      {
        key: "support",
        icon: Heart,
        label: "Поддержать проект",
        primaryHref: "/support",
        links: [{ label: "Поддержать проект", href: "/support" }],
      },
      {
        key: "admin",
        icon: Wrench,
        label: "Админка",
        primaryHref: "/admin",
        adminOnly: true,
        links: [{ label: "Админка", href: "/admin" }],
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
    <aside className="fixed left-0 top-0 z-40 flex h-dvh w-16 flex-col bg-[#2d2d2d] text-[#ccc]">
      <div className="h-20 shrink-0 border-b border-[#3d3d3d]">
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
            <span className="mt-1 text-[9px] font-semibold tracking-[0.18em] text-[#ccc]">
              MELARDO
            </span>
          </div>
        </Link>
      </div>

      <div className="sidebar-scroll flex-1 overflow-y-auto py-1">
        <nav className="flex flex-col items-center gap-0.5 px-1.5">
          {visibleGroups.map((g) => {
            const Icon = g.icon;
            const isOpen = activeKey === g.key;
            return (
              <div
                key={g.key}
                className="relative w-full"
              >
                <div
                  className="relative"
                  onMouseEnter={() => openPanel(g.key)}
                  onMouseLeave={() => scheduleClosePanel(g.key)}
                >
                  <Link
                    href={g.primaryHref}
                    className="flex h-10 w-full items-center justify-center rounded-md text-[#ccc] hover:bg-[#3d3d3d] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3d3d3d] transition-colors duration-200"
                    aria-label={g.label}
                  >
                    <Icon className="h-7 w-7" />
                  </Link>

                  <div
                    className="absolute left-full top-0 z-50 pl-2"
                    onMouseEnter={() => openPanel(g.key)}
                    onMouseLeave={() => scheduleClosePanel(g.key)}
                  >
                    <div
                      className={[
                        "w-[200px] origin-left rounded-lg border border-[#3d3d3d] bg-[#2d2d2d] p-2 shadow-2xl shadow-black/40",
                        "transition-[opacity,transform] duration-200 ease-out",
                        isOpen ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0 pointer-events-none",
                      ].join(" ")}
                    >
                      <div className="px-2 pb-1 pt-1 text-[11px] font-semibold tracking-wide text-[#ccc]">
                        {g.label}
                      </div>
                      <div className="mt-1 space-y-1">
                        {g.links.map((l) => (
                          <Link
                            key={l.href + l.label}
                            href={l.href}
                            className="block rounded-md px-2 py-1.5 text-sm text-[#ccc] hover:bg-[#3d3d3d] hover:text-white transition-colors duration-200"
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

        </nav>
      </div>

      {hasUser && (
        <div className="shrink-0 border-t border-[#3d3d3d] px-1.5 pb-2 pt-2">
          <form action={signOut}>
            <button
              type="submit"
              className="flex h-9 w-full items-center justify-center rounded-md text-[#ccc] hover:bg-[#3d3d3d] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3d3d3d] transition-colors duration-200"
              aria-label="Выйти"
            >
              <LogOut className="h-7 w-7" />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}

