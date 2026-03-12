"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Clan, ClanMember, ClanInvite, ClanWar } from "@/lib/types";

const MIN_MEMBERS_FOR_CLAN_WAR = 5;

export type ClanWithStats = Clan & {
  member_count: number;
  wins: number;
  losses: number;
};

export async function getClansLeaderboard(limit = 100): Promise<ClanWithStats[]> {
  const supabase = await createClient();
  const { data: clans } = await supabase
    .from("clans")
    .select("*")
    .order("rating", { ascending: false })
    .limit(limit);
  if (!clans?.length) return [];

  const clanIds = clans.map((c) => c.id);
  const [membersRes, clanMatchesRes] = await Promise.all([
    supabase.from("clan_members").select("clan_id").in("clan_id", clanIds),
    supabase.from("clan_matches").select("clan1_id, clan2_id, match_id"),
  ]);

  const memberCountByClan = new Map<string, number>();
  (membersRes?.data ?? []).forEach((m) => {
    memberCountByClan.set(m.clan_id, (memberCountByClan.get(m.clan_id) ?? 0) + 1);
  });

  const matchIds = [...new Set((clanMatchesRes?.data ?? []).map((cm: any) => cm.match_id))];
  const { data: matches } = matchIds.length
    ? await supabase.from("matches").select("id, status, score_team1, score_team2").in("id", matchIds)
    : { data: [] };
  const matchMap = new Map((matches ?? []).map((m) => [m.id, m]));

  const winsByClan = new Map<string, number>();
  const lossesByClan = new Map<string, number>();
  (clanMatchesRes?.data ?? []).forEach((cm: any) => {
    const m = matchMap.get(cm.match_id);
    if (!m || m.status !== "completed") return;
    const s1 = m.score_team1 ?? 0;
    const s2 = m.score_team2 ?? 0;
    const c1Won = s1 > s2;
    winsByClan.set(cm.clan1_id, (winsByClan.get(cm.clan1_id) ?? 0) + (c1Won ? 1 : 0));
    lossesByClan.set(cm.clan1_id, (lossesByClan.get(cm.clan1_id) ?? 0) + (c1Won ? 0 : 1));
    winsByClan.set(cm.clan2_id, (winsByClan.get(cm.clan2_id) ?? 0) + (c1Won ? 0 : 1));
    lossesByClan.set(cm.clan2_id, (lossesByClan.get(cm.clan2_id) ?? 0) + (c1Won ? 1 : 0));
  });

  return clans.map((c) => ({
    ...c,
    member_count: memberCountByClan.get(c.id) ?? 0,
    wins: winsByClan.get(c.id) ?? 0,
    losses: lossesByClan.get(c.id) ?? 0,
  })) as ClanWithStats[];
}

export async function getClan(id: string): Promise<(Clan & { owner_nick?: string | null }) | null> {
  const supabase = await createClient();
  const { data: clan } = await supabase.from("clans").select("*").eq("id", id).single();
  if (!clan) return null;
  const { data: owner } = await supabase
    .from("profiles")
    .select("warface_nick")
    .eq("id", clan.owner_id)
    .single();
  return { ...clan, owner_nick: owner?.warface_nick ?? null } as Clan & { owner_nick?: string | null };
}

export async function getClanMembers(clanId: string): Promise<(ClanMember & { warface_nick?: string | null; display_name?: string | null })[]> {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("clan_members")
    .select("*")
    .eq("clan_id", clanId)
    .order("joined_at");
  if (!members?.length) return [];
  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, warface_nick, display_name")
    .in("id", userIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  return members.map((m) => ({
    ...m,
    warface_nick: profileMap.get(m.user_id)?.warface_nick ?? null,
    display_name: profileMap.get(m.user_id)?.display_name ?? null,
  }));
}

export async function getClanMatches(clanId: string, limit = 20) {
  const supabase = await createClient();
  const { data: clanMatches } = await supabase
    .from("clan_matches")
    .select("id, clan1_id, clan2_id, match_id, created_at")
    .or(`clan1_id.eq.${clanId},clan2_id.eq.${clanId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!clanMatches?.length) return [];
  const matchIds = clanMatches.map((cm) => cm.match_id);
  const clanIds = [...new Set(clanMatches.flatMap((cm) => [cm.clan1_id, cm.clan2_id]))];
  const [matchesRes, clansRes] = await Promise.all([
    supabase.from("matches").select("id, score_team1, score_team2, status, completed_at").in("id", matchIds),
    supabase.from("clans").select("id, name, tag").in("id", clanIds),
  ]);
  const matchMap = new Map((matchesRes?.data ?? []).map((m) => [m.id, m]));
  const clanMap = new Map((clansRes?.data ?? []).map((c) => [c.id, c]));
  return clanMatches.map((cm) => ({
    ...cm,
    clan1: clanMap.get(cm.clan1_id) ?? null,
    clan2: clanMap.get(cm.clan2_id) ?? null,
    match: matchMap.get(cm.match_id) ?? null,
  }));
}

export async function getCurrentUserClan(): Promise<{
  clan: Clan;
  role: string;
} | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase
    .from("clan_members")
    .select("clan_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return null;
  const { data: clan } = await supabase.from("clans").select("*").eq("id", member.clan_id).single();
  if (!clan) return null;
  return { clan: clan as Clan, role: member.role };
}

export async function getPendingClanInvites(userId: string): Promise<ClanInvite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clan_invites")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []) as ClanInvite[];
}

export async function getClanRole(clanId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", clanId)
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.role ?? null;
}

export async function getClanMessages(clanId: string, limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clan_messages")
    .select(`
      id,
      message,
      created_at,
      profile:profiles(id, warface_nick, display_name)
    `)
    .eq("clan_id", clanId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).reverse();
}

export async function createClan(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Необходима авторизация" };

  const name = String(formData.get("name") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim().toUpperCase();
  const description = String(formData.get("description") ?? "").trim() || null;
  const logo_url = String(formData.get("logo_url") ?? "").trim() || null;

  if (!name || name.length < 2) return { error: "Название клана должно быть не менее 2 символов" };
  if (!tag || tag.length < 2 || tag.length > 5) return { error: "Тег клана: 2–5 символов" };
  if (!/^[A-Za-z0-9]+$/.test(tag)) return { error: "Тег может содержать только буквы и цифры" };

  const { data: existing } = await supabase
    .from("clan_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return { error: "Вы уже состоите в клане" };

  const { data: tagExists } = await supabase
    .from("clans")
    .select("id")
    .ilike("tag", tag)
    .maybeSingle();
  if (tagExists) return { error: "Тег уже занят" };

  const { error } = await supabase.from("clans").insert({
    name,
    tag,
    description,
    logo_url,
    owner_id: user.id,
    rating: 1000,
  });
  if (error) return { error: error.message };
  revalidatePath("/clans");
  revalidatePath("/clan");
  return {};
}

export async function leaveClan(clanId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Необходима авторизация" };

  const { data: member } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", clanId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { error: "Вы не в этом клане" };
  if (member.role === "owner") return { error: "Владелец не может покинуть клан. Передайте владение." };

  const { error } = await supabase
    .from("clan_members")
    .delete()
    .eq("clan_id", clanId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath(`/clan/${clanId}`);
  revalidatePath("/clans");
  revalidatePath("/profile");
  return {};
}
