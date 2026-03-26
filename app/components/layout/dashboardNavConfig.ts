import type React from "react";
import {
  Home,
  User,
  Users,
  Swords,
  Trophy,
  Shield,
  BarChart3,
  Zap,
  Heart,
  Wrench,
  CalendarDays,
  Target,
  Gift,
  MessageCircleMore,
  Route,
  Clock3,
  LineChart,
  UserPlus,
  ArrowLeftRight,
  Handshake,
  MessageSquareText,
  Landmark,
} from "lucide-react";

export type NavMatchMode = "exact" | "prefix";

export type DashboardNavItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: NavMatchMode;
  /**
   * Extra prefixes that should also activate this item.
   * Example: "/clan" should activate the "Кланы" menu item that navigates to "/clans".
   */
  matchPrefixes?: string[];
  /**
   * Role-based visibility.
   * If omitted - visible for all authenticated users.
   */
  roles?: Array<"admin" | "user">;
};

export const userDashboardNav: DashboardNavItem[] = [
  {
    key: "dashboard",
    label: "Платформа",
    href: "/dashboard",
    icon: Home,
    match: "exact",
  },
  {
    key: "profile",
    label: "Профиль",
    href: "/profile",
    icon: User,
    match: "prefix",
  },
  {
    key: "matches",
    label: "Вызовы",
    href: "/matches",
    icon: Swords,
    match: "prefix",
  },
  {
    key: "teams",
    label: "Команды",
    href: "/teams",
    icon: Users,
    match: "prefix",
  },
  {
    key: "clans",
    label: "Кланы",
    href: "/clans",
    icon: Shield,
    match: "prefix",
    matchPrefixes: ["/clans", "/clan"],
  },
  {
    key: "tournaments",
    label: "Турниры",
    href: "/tournaments",
    icon: Trophy,
    match: "prefix",
    matchPrefixes: ["/tournaments", "/tournament"],
  },
  {
    key: "missions",
    label: "Миссии",
    href: "/missions",
    icon: Zap,
    match: "exact",
  },
  {
    key: "leaderboard",
    label: "Лидерборд",
    href: "/leaderboard",
    icon: LineChart,
    match: "exact",
  },
  {
    key: "league-archive",
    label: "Архив лиги",
    href: "/league/archive",
    icon: Landmark,
    match: "exact",
  },
  {
    key: "season",
    label: "Сезон",
    href: "/season",
    icon: CalendarDays,
    match: "prefix",
    matchPrefixes: ["/season", "/season-leaderboard"],
  },
  {
    key: "rankings",
    label: "Рейтинги",
    href: "/rankings",
    icon: BarChart3,
    match: "prefix",
  },
  {
    key: "ranks",
    label: "Дивизионы",
    href: "/ranks",
    icon: Target,
    match: "exact",
  },
  {
    key: "referral",
    label: "Рефералы",
    href: "/referral",
    icon: Handshake,
    match: "prefix",
  },
  {
    key: "quick-match",
    label: "Быстрый матч",
    href: "/quick-match",
    icon: Clock3,
    match: "exact",
  },
  {
    key: "stats",
    label: "Статистика",
    href: "/stats",
    icon: BarChart3,
    match: "exact",
  },
  {
    key: "support",
    label: "Поддержка",
    href: "/support",
    icon: Heart,
    match: "exact",
  },
  {
    key: "connect-telegram",
    label: "Telegram",
    href: "/connect-telegram",
    icon: MessageSquareText,
    match: "exact",
  },
];

export const adminDashboardNav: DashboardNavItem[] = [
  {
    key: "admin-home",
    label: "Админка",
    href: "/admin",
    icon: Wrench,
    match: "exact",
    roles: ["admin"],
    matchPrefixes: ["/admin"],
  },
  {
    key: "admin-players",
    label: "Игроки",
    href: "/admin/players",
    icon: UserPlus,
    match: "prefix",
    roles: ["admin"],
    matchPrefixes: ["/admin/players", "/admin/player-view"],
  },
  {
    key: "admin-teams",
    label: "Команды",
    href: "/admin/teams",
    icon: Users,
    match: "prefix",
    roles: ["admin"],
    matchPrefixes: ["/admin/teams", "/admin/team-view"],
  },
  {
    key: "admin-tournaments",
    label: "Турниры",
    href: "/admin/tournaments",
    icon: Trophy,
    match: "prefix",
    roles: ["admin"],
    matchPrefixes: ["/admin/tournaments"],
  },
  {
    key: "admin-tournament-requests",
    label: "Запросы турниров",
    href: "/admin/tournament-requests",
    icon: Route,
    match: "prefix",
    roles: ["admin"],
    matchPrefixes: ["/admin/tournament-requests"],
  },
  {
    key: "admin-points",
    label: "Очки",
    href: "/admin/points",
    icon: BarChart3,
    match: "prefix",
    roles: ["admin"],
    matchPrefixes: ["/admin/points"],
  },
  {
    key: "admin-referrals",
    label: "Рефералы",
    href: "/admin/referrals",
    icon: Handshake,
    match: "prefix",
    roles: ["admin"],
    matchPrefixes: ["/admin/referrals"],
  },
  {
    key: "admin-complaints",
    label: "Жалобы",
    href: "/admin/complaints",
    icon: MessageCircleMore,
    match: "prefix",
    roles: ["admin"],
    matchPrefixes: ["/admin/complaints"],
  },
  {
    key: "admin-disputed-matches",
    label: "Спорные матчи",
    href: "/admin/disputed-matches",
    icon: ArrowLeftRight,
    match: "prefix",
    roles: ["admin"],
    matchPrefixes: ["/admin/disputed-matches"],
  },
  {
    key: "admin-logs",
    label: "Логи",
    href: "/admin/logs",
    icon: Clock3,
    match: "prefix",
    roles: ["admin"],
    matchPrefixes: ["/admin/logs"],
  },
  {
    key: "admin-seasons",
    label: "Сезоны",
    href: "/admin/seasons",
    icon: CalendarDays,
    match: "prefix",
    roles: ["admin"],
    matchPrefixes: ["/admin/seasons"],
  },
  {
    key: "admin-donations",
    label: "Донаты",
    href: "/admin/donations",
    icon: Gift,
    match: "prefix",
    roles: ["admin"],
    matchPrefixes: ["/admin/donations"],
  },
  {
    key: "admin-matches",
    label: "Матчи",
    href: "/admin/matches",
    icon: Swords,
    match: "prefix",
    roles: ["admin"],
    matchPrefixes: ["/admin/matches"],
  },
  {
    key: "admin-users",
    label: "Пользователи",
    href: "/admin/users",
    icon: UserPlus,
    match: "prefix",
    roles: ["admin"],
    matchPrefixes: ["/admin/users"],
  },
];

export function isNavItemVisible(
  item: DashboardNavItem,
  ctx: { role: "admin" | "user" | null }
) {
  if (!item.roles || item.roles.length === 0) return true;
  if (!ctx.role) return false;
  return item.roles.includes(ctx.role);
}

export function isNavItemActive(pathname: string, item: DashboardNavItem) {
  const matchMode: NavMatchMode = item.match ?? "prefix";
  const prefixes = (item.matchPrefixes && item.matchPrefixes.length > 0
    ? item.matchPrefixes
    : [item.href]
  ).filter(Boolean);

  const matchExact = (prefix: string) => pathname === prefix;
  const matchPrefix = (prefix: string) =>
    pathname === prefix || pathname.startsWith(prefix + "/");

  return prefixes.some((p) => (matchMode === "exact" ? matchExact(p) : matchPrefix(p)));
}

