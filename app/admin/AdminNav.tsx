import Link from "next/link";

type AdminNavSection =
  | "home"
  | "donations"
  | "referrals"
  | "points"
  | "tournaments"
  | "disputed-matches"
  | "complaints"
  | "players"
  | "teams"
  | "seasons";

const navItems: { key: AdminNavSection; href: string; label: string }[] = [
  { key: "home", href: "/admin", label: "📊 Главная" },
  { key: "donations", href: "/admin/donations", label: "💰 Донаты" },
  { key: "referrals", href: "/admin/referrals", label: "🔗 Рефералы" },
  { key: "points", href: "/admin/points", label: "📈 Начисление очков" },
  { key: "tournaments", href: "/admin/tournaments", label: "🏆 Турниры" },
  {
    key: "disputed-matches",
    href: "/admin/disputed-matches",
    label: "⚠️ Спорные матчи",
  },
  { key: "complaints", href: "/admin/complaints", label: "🚨 Жалобы" },
  { key: "players", href: "/admin/players", label: "👥 Игроки" },
  { key: "teams", href: "/admin/teams", label: "🏢 Команды" },
  { key: "seasons", href: "/admin/seasons", label: "📅 Сезоны" },
];

export function AdminNav({ active }: { active?: AdminNavSection }) {
  return (
    <nav className="mb-6 overflow-x-auto border-b border-neutral-200 pb-4 text-sm dark:border-neutral-800">
      <div className="flex w-max gap-2 whitespace-nowrap">
        {navItems.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={
                isActive
                  ? "inline-flex items-center gap-1 rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-neutral-100 shadow-sm dark:bg-neutral-100 dark:text-neutral-900"
                  : "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              }
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

