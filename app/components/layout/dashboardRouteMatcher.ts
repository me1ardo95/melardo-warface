export type DashboardZone = "public" | "user" | "admin";

/**
 * Zone detection based only on pathname.
 * Auth gating (after login) happens in the shell/layout layer.
 */
export function getDashboardZoneFromPathname(pathname: string): DashboardZone {
  if (!pathname) return "public";
  if (pathname === "/") return "public";

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";

  const internalPrefixes = [
    "/profile",
    "/matches",
    "/missions",
    "/leaderboard",
    "/league",
    "/season",
    "/season-leaderboard",
    "/rankings",
    "/ranks",
    "/referral",
    "/teams",
    "/clans",
    "/clan",
    "/quick-match",
    "/tournaments",
    "/tournament",
    "/support",
    "/stats",
    "/dashboard",
    "/connect-telegram",
    "/tournaments/request",
  ];

  const isInternal = internalPrefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  return isInternal ? "user" : "public";
}

