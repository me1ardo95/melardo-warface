"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Profile } from "@/lib/types";
import { signOut } from "@/app/actions/auth";
import {
  adminDashboardNav,
  DashboardNavItem,
  isNavItemActive,
  isNavItemVisible,
  userDashboardNav,
} from "./dashboardNavConfig";
import { ChevronDown, ChevronLeft, ChevronRight, LogOut, Wrench } from "lucide-react";

type SidebarProps = {
  profile: Profile;
  isAdmin: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (next: boolean) => void;
};

function getDisplayName(profile: Profile) {
  return profile.display_name || profile.warface_nick || profile.email || "Игрок";
}

export function Sidebar({
  profile,
  isAdmin,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileOpenChange,
}: SidebarProps) {
  const pathname = usePathname();
  const role = isAdmin ? ("admin" as const) : ("user" as const);

  const [adminPanelOpen, setAdminPanelOpen] = useState(isAdmin);

  const items = useMemo(() => {
    const userItems = userDashboardNav.filter((i) => isNavItemVisible(i, { role: "user" }));
    const adminItems = isAdmin
      ? adminDashboardNav.filter((i) => isNavItemVisible(i, { role }))
      : [];
    return { userItems, adminItems };
  }, [isAdmin, role]);

  const isAnyAdminActive = items.adminItems.some((item) =>
    isNavItemActive(pathname, item)
  );

  useEffect(() => {
    setAdminPanelOpen(isAdmin);
  }, [isAdmin]);

  // Если мы уже на админ-маршруте, держим админ-панель раскрытой
  // (чтобы активный пункт был видим).
  useEffect(() => {
    if (isAdmin && isAnyAdminActive) setAdminPanelOpen(true);
  }, [isAdmin, isAnyAdminActive]);

  const closeMobileDrawer = () => onMobileOpenChange(false);

  const renderNavItem = (
    key: string,
    item: DashboardNavItem,
    opts?: { forceShowText?: boolean }
  ) => {
    const active = isNavItemActive(pathname, item);
    const Icon = item.icon;
    const showText = opts?.forceShowText ?? !collapsed;

    const className = [
      "group flex h-10 w-full items-center gap-3 rounded-md border px-2 transition-colors duration-200",
      active
        ? "border-[#F97316]/40 bg-[#F97316]/10 text-white"
        : "border-transparent text-[#B0B8C5] hover:border-[#3d3d3d] hover:bg-[#11141A] hover:text-white",
    ].join(" ");

    return (
      <Link
        key={key}
        href={item.href}
        title={!showText ? item.label : undefined}
        aria-label={item.label}
        onClick={() => {
          // Close drawer after navigation on mobile.
          closeMobileDrawer();
        }}
        className={className}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {showText && (
          <span className="truncate text-sm font-medium">
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  const avatarInitial = getDisplayName(profile).charAt(0).toUpperCase();

  const Brand = (
    <div className="flex items-center gap-3">
      <img
        src="/branding/logo.png"
        alt="MELARDO WARFACE"
        className="h-9 w-9 object-contain"
      />
      {!collapsed && (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-[0.14em]">
            MELARDO WARFACE
          </div>
        </div>
      )}
    </div>
  );

  const SidebarCore = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-[#2A2F3A] px-3">
        {Brand}
        <button
          type="button"
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          onClick={onToggleCollapsed}
          className="hidden rounded-md p-2 text-[#B0B8C5] hover:bg-[#11141A] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] sm:inline-flex"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="sidebar-scroll flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-2 py-2">
        <nav className="space-y-1.5">
          {items.adminItems.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setAdminPanelOpen((v) => !v)}
                aria-expanded={adminPanelOpen}
                className={[
                  "group flex h-10 w-full items-center gap-3 rounded-md border px-2 transition-colors duration-200",
                  isAnyAdminActive
                    ? "border-[#F97316]/40 bg-[#F97316]/10 text-white"
                    : "border-transparent text-[#B0B8C5] hover:border-[#3d3d3d] hover:bg-[#11141A] hover:text-white",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]",
                ].join(" ")}
              >
                <Wrench className="h-5 w-5 shrink-0" />
                <span className={collapsed ? "sm:hidden" : undefined}>
                  Админ панель
                </span>
                <ChevronDown
                  className={[
                    "ml-auto h-4 w-4 shrink-0 text-[#8B93A3] transition-transform duration-200",
                    adminPanelOpen ? "rotate-180" : "rotate-0",
                  ].join(" ")}
                />
              </button>

              {adminPanelOpen && (
                <div className={collapsed ? "space-y-1" : "space-y-1 pl-2"}>
                  {items.adminItems.map((item) =>
                    renderNavItem(item.key, item)
                  )}
                </div>
              )}
            </>
          )}
          {items.adminItems.length > 0 && <div className="my-2 border-t border-[#2A2F3A]" />}
          {items.userItems.map((item) => renderNavItem(item.key, item))}
        </nav>
      </div>

      <div className="shrink-0 border-t border-[#2A2F3A] px-2 pb-2 pt-1.5">
        <Link
          href="/profile"
          aria-label="Открыть профиль"
          className={[
            "group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-200 hover:bg-[#11141A]",
            collapsed ? "justify-center" : "justify-start",
          ].join(" ")}
          onClick={() => {
            closeMobileDrawer();
          }}
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[#F97316]/30"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#11141A] text-sm font-semibold text-[#F97316] ring-2 ring-[#F97316]/30">
              {avatarInitial}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {getDisplayName(profile)}
              </div>
              {profile.warface_nick && (
                <div className="truncate text-[11px] text-[#B0B8C5]">
                  {profile.warface_nick}
                </div>
              )}
            </div>
          )}
        </Link>

        <form action={signOut} className="mt-1.5">
          <button
            type="submit"
            aria-label="Выйти"
            className={[
              "flex h-9 w-full items-center justify-center rounded-md border px-3 text-[#B0B8C5] transition-colors duration-200",
              "border-[#2A2F3A] hover:border-[#F97316]/40 hover:bg-[#11141A] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]",
              collapsed ? "gap-0" : "gap-3",
            ].join(" ")}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="text-sm font-medium">Выйти</span>}
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[#2A2F3A] bg-[#0B0F14] text-[#B0B8C5] sm:flex",
        ].join(" ")}
        style={{
          width: collapsed ? 72 : 236,
        }}
      >
        {SidebarCore}
      </aside>

      {/* Mobile drawer */}
      <div
        className={[
          "fixed inset-0 z-50 sm:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={closeMobileDrawer}
          className={[
            "absolute inset-0 bg-black/60 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />

        <aside
          className={[
            "absolute left-0 top-0 h-dvh border-r bg-[#0B0F14] text-[#B0B8C5] shadow-2xl",
            "transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
          style={{ width: 260 }}
        >
          {/* On mobile, treat expanded mode always for better readability */}
          <div className="h-full">
            <div className="h-14 px-3 pt-1">
              <div className="flex h-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="/branding/logo.png"
                    alt="MELARDO WARFACE"
                    className="h-9 w-9 object-contain"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold tracking-[0.14em]">
                      MELARDO WARFACE
                    </div>
                    <div className="truncate text-xs text-[#B0B8C5]">Меню</div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Свернуть / развернуть меню"
                  onClick={() => {
                    onToggleCollapsed();
                  }}
                  className="rounded-md p-2 hover:bg-[#11141A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
                >
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Закрыть меню"
                  onClick={closeMobileDrawer}
                  className="ml-1 rounded-md p-2 hover:bg-[#11141A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
              {/* Reuse navigation but force text visible */}
              <div className="sidebar-scroll flex-1 overflow-y-auto px-2 pb-2">
                <nav className="space-y-2">
                  {items.userItems.map((item) =>
                    renderNavItem(item.key, item, { forceShowText: true })
                  )}
                  {items.adminItems.length > 0 && (
                    <>
                      <div className="my-3 border-t border-[#2A2F3A]" />
                      <button
                        type="button"
                        onClick={() => setAdminPanelOpen((v) => !v)}
                        aria-expanded={adminPanelOpen}
                        className={[
                          "group flex h-10 w-full items-center gap-3 rounded-md border px-2 transition-colors duration-200",
                          isAnyAdminActive
                            ? "border-[#F97316]/40 bg-[#F97316]/10 text-white"
                            : "border-transparent text-[#B0B8C5] hover:border-[#3d3d3d] hover:bg-[#11141A] hover:text-white",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]",
                        ].join(" ")}
                      >
                        <Wrench className="h-5 w-5 shrink-0" />
                        <span>Админ панель</span>
                        <ChevronDown
                          className={[
                            "ml-auto h-4 w-4 shrink-0 text-[#8B93A3] transition-transform duration-200",
                            adminPanelOpen ? "rotate-180" : "rotate-0",
                          ].join(" ")}
                        />
                      </button>

                      {adminPanelOpen && (
                        <div className={collapsed ? "space-y-1" : "space-y-1 pl-2"}>
                          {items.adminItems.map((item) =>
                            renderNavItem(item.key, item, { forceShowText: true })
                          )}
                        </div>
                      )}
                    </>
                  )}
                </nav>
              </div>

              <div className="shrink-0 border-t border-[#2A2F3A] px-2 pb-3 pt-2">
                <Link
                  href="/profile"
                  aria-label="Открыть профиль"
                  className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors duration-200 hover:bg-[#11141A]"
                  onClick={closeMobileDrawer}
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[#F97316]/30"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#11141A] text-sm font-semibold text-[#F97316] ring-2 ring-[#F97316]/30">
                      {avatarInitial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {getDisplayName(profile)}
                    </div>
                    {profile.warface_nick && (
                      <div className="truncate text-xs text-[#B0B8C5]">
                        {profile.warface_nick}
                      </div>
                    )}
                  </div>
                </Link>

                <form action={signOut} className="mt-2">
                  <button
                    type="submit"
                    aria-label="Выйти"
                    className="flex h-10 w-full items-center justify-center gap-3 rounded-md border border-[#2A2F3A] px-3 text-[#B0B8C5] transition-colors duration-200 hover:border-[#F97316]/40 hover:bg-[#11141A] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="text-sm font-medium">Выйти</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

