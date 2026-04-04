"use client";

import { useEffect, useMemo, useState } from "react";
import type { Profile } from "@/lib/types";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

type InternalSidebarLayoutProps = {
  profile: Profile;
  isAdmin: boolean;
  children: ReactNode;
};

const COLLAPSED_WIDTH = 72;
const EXPANDED_WIDTH = 236;

export function InternalSidebarLayout({
  profile,
  isAdmin,
  children,
}: InternalSidebarLayoutProps) {
  /** Desktop: sidebar expands on hover; default is icon-only rail. */
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const collapsed = !desktopSidebarExpanded;

  useEffect(() => {
    // Close drawer on Escape for accessibility.
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const leftPadding = useMemo(
    () => (desktopSidebarExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH),
    [desktopSidebarExpanded]
  );

  return (
    <>
      {/* Mobile: hamburger button */}
      <div className="sm:hidden">
        <button
          type="button"
          aria-label="Открыть меню"
          onClick={() => setMobileOpen(true)}
          className="fixed left-3 top-3 z-50 rounded-md border border-[#2A2F3A] bg-[#0B0F14]/90 p-2 text-[#B0B8C5] backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <Sidebar
        profile={profile}
        isAdmin={isAdmin}
        collapsed={collapsed}
        onDesktopExpandedChange={setDesktopSidebarExpanded}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />

      {/* Desktop content offset is controlled via CSS variable */}
      <div
        style={
          {
            ["--sidebar-width" as any]: `${leftPadding}px`,
          } as CSSProperties
        }
        className="min-h-dvh transition-[padding-left] duration-300 ease-out sm:pl-[var(--sidebar-width)]"
      >
        <main className="w-full px-4 pb-10 pt-6 sm:px-6">{children}</main>
      </div>
    </>
  );
}

