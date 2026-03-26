import type { Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

/**
 * Normalize profiles.role from DB or auth metadata (trim/case).
 * DB check constraint expects 'admin' | 'user', but clients may receive edge values.
 */
export function normalizeProfileRole(raw: unknown): "admin" | "user" {
  if (raw == null || raw === "") return "user";
  const s = String(raw).trim().toLowerCase();
  return s === "admin" ? "admin" : "user";
}

/** True when the profile should be treated as admin in the dashboard shell. */
export function profileIsAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === "admin";
}

/**
 * Merge row from `profiles` with normalized role; optional fallback from Supabase User metadata.
 */
export function profileFromRow(
  row: Record<string, unknown> | null,
  authUser?: User | null
): Profile | null {
  if (!row) return null;

  const metaRole =
    (typeof authUser?.app_metadata?.role === "string"
      ? authUser.app_metadata.role
      : null) ??
    (typeof authUser?.user_metadata?.role === "string"
      ? authUser.user_metadata.role
      : null);

  const role = normalizeProfileRole(row.role ?? metaRole);

  return { ...(row as unknown as Profile), role };
}
