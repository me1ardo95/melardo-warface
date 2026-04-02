"use client";

import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";
import { profileIsAdmin } from "@/lib/profile-role";
import { SupabaseSidebarNav } from "./SupabaseSidebarNav";
import { InternalSidebarLayout } from "./InternalSidebarLayout";
import { getDashboardZoneFromPathname } from "./dashboardRouteMatcher";
import { LandingHeader } from "./LandingHeader";
import type { ReactNode } from "react";

type AppShellProps = {
  profile: Profile | null;
  children: ReactNode;
};

export function AppShell({ profile, children }: AppShellProps) {
  const pathname = usePathname();
  const zone = getDashboardZoneFromPathname(pathname);
  const isAuthed = !!profile;

  const isAdmin = profileIsAdmin(profile);

  if (zone === "user" && isAuthed) {
    return (
      <InternalSidebarLayout profile={profile} isAdmin={isAdmin}>
        {children}
      </InternalSidebarLayout>
    );
  }

  if (zone === "admin" && isAuthed) {
    return (
      <InternalSidebarLayout profile={profile} isAdmin={isAdmin}>
        {children}
      </InternalSidebarLayout>
    );
  }

  // Auth pages must be standalone (no dashboard sidebar/menu).
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  // Public pages that should stay in base header layout: no dashboard sidebar shell.
  if (pathname === "/" || pathname === "/rules") {
    return (
      <>
        <LandingHeader profile={profile} />
        <main className="mx-auto max-w-5xl px-4 pb-12 pt-6">{children}</main>
      </>
    );
  }

  // Public pages (or internal routes while unauthenticated):
  // Keep the current navigation model intact.
  return (
    <>
      <SupabaseSidebarNav />
      <div className="pl-16">
        <main className="mx-auto max-w-5xl px-4 pb-12 pt-6">{children}</main>
      </div>
    </>
  );
}

