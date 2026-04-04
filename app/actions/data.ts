"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enqueueTelegramNotification } from "@/lib/telegram-queue";
import type {
  Team,
  Tournament,
  Match,
  Ranking,
  Profile,
  TeamInvitation,
  Challenge,
  JoinRequest,
} from "@/lib/types";
import { profileFromRow } from "@/lib/profile-role";

// —— Profile (current user) ——
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error || !data) return null;
  return profileFromRow(data as unknown as Record<string, unknown>, user);
}

export async function getTopPlayers(limit = 5): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, warface_nick, avatar_url, points")
    .order("points", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as Profile[];
}

// —— Teams ——
export async function getTeams(): Promise<Team[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Team[];
}

export type TeamWithStats = Team & {
  wins: number;
  losses: number;
  total_matches: number;
  points: number;
  member_count: number;
  captain_nick: string | null;
  last_results: ("win" | "loss")[];
  created_at: string;
};

export async function getTeamsWithStats(): Promise<TeamWithStats[]> {
  const supabase = await createClient();
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .order("name");
  if (teamsError) throw teamsError;
  if (!teams?.length) return [];

  const teamIds = new Set(teams.map((t) => t.id));

  const [
    { data: allMatchesRaw },
    { data: rankings },
    { data: memberCounts },
    { data: captains },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("team1_id, team2_id, score_team1, score_team2, status, completed_at")
      .order("completed_at", { ascending: false, nullsFirst: false }),
    supabase.from("rankings").select("team_id, points, wins, losses"),
    supabase.from("team_members").select("team_id"),
    supabase.from("team_members").select("team_id, user_id").eq("role", "captain"),
  ]);

  const allMatches = (allMatchesRaw ?? []).filter(
    (m) => (m.team1_id && teamIds.has(m.team1_id)) || (m.team2_id && teamIds.has(m.team2_id))
  );
  const matches = allMatches.filter((m) => m.status === "completed");

  const captainUserIds = [...new Set((captains ?? []).map((c) => c.user_id))];
  const captainProfilesResult =
    captainUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, warface_nick")
          .in("id", captainUserIds)
      : { data: [] as { id: string; warface_nick: string | null }[] };
  const captainProfilesList = captainProfilesResult.data ?? [];
  const captainNickByUser = new Map(
    captainProfilesList.map((p) => [p.id, p.warface_nick ?? null])
  );
  const captainByTeam = new Map<string, string | null>();
  (captains ?? []).forEach((c) => {
    captainByTeam.set(c.team_id, captainNickByUser.get(c.user_id) ?? null);
  });

  const pointsByTeam = new Map<string, number>();
  (rankings ?? []).forEach((r) => {
    const prev = pointsByTeam.get(r.team_id) ?? 0;
    pointsByTeam.set(r.team_id, prev + (r.points ?? 0));
  });

  const membersByTeam = new Map<string, number>();
  (memberCounts ?? []).forEach((m) => {
    membersByTeam.set(m.team_id, (membersByTeam.get(m.team_id) ?? 0) + 1);
  });

  const winsByTeam = new Map<string, number>();
  (matches ?? []).forEach((m) => {
    const t1 = m.team1_id;
    const t2 = m.team2_id;
    if (!t1 || !t2) return;
    const s1 = m.score_team1 ?? 0;
    const s2 = m.score_team2 ?? 0;
    const t1Won = s1 > s2;
    winsByTeam.set(t1, (winsByTeam.get(t1) ?? 0) + (t1Won ? 1 : 0));
    winsByTeam.set(t2, (winsByTeam.get(t2) ?? 0) + (t1Won ? 0 : 1));
  });

  const totalMatchesByTeam = new Map<string, number>();
  (allMatches ?? []).forEach((m) => {
    if (m.team1_id) totalMatchesByTeam.set(m.team1_id, (totalMatchesByTeam.get(m.team1_id) ?? 0) + 1);
    if (m.team2_id) totalMatchesByTeam.set(m.team2_id, (totalMatchesByTeam.get(m.team2_id) ?? 0) + 1);
  });

  const lastResultsSorted = new Map<string, ("win" | "loss")[]>();
  (allMatches ?? [])
    .filter((m) => m.status === "completed")
    .forEach((m) => {
      const t1 = m.team1_id;
      const t2 = m.team2_id;
      if (!t1 || !t2) return;
      const s1 = m.score_team1 ?? 0;
      const s2 = m.score_team2 ?? 0;
      const t1Won = s1 > s2;
      [t1, t2].forEach((tid) => {
        const arr = lastResultsSorted.get(tid) ?? [];
        if (arr.length < 5) {
          const isT1 = tid === t1;
          arr.push(isT1 === t1Won ? "win" : "loss");
          lastResultsSorted.set(tid, arr);
        }
      });
    });

  const completedMatchesByTeam = new Map<string, number>();
  (matches ?? []).forEach((m) => {
    if (m.team1_id) completedMatchesByTeam.set(m.team1_id, (completedMatchesByTeam.get(m.team1_id) ?? 0) + 1);
    if (m.team2_id) completedMatchesByTeam.set(m.team2_id, (completedMatchesByTeam.get(m.team2_id) ?? 0) + 1);
  });

  return (teams as Team[]).map((t) => {
    const wins = winsByTeam.get(t.id) ?? 0;
    const games = completedMatchesByTeam.get(t.id) ?? 0;
    return {
      ...t,
      wins,
      losses: games - wins,
      total_matches: totalMatchesByTeam.get(t.id) ?? 0,
      points: pointsByTeam.get(t.id) ?? 0,
      member_count: membersByTeam.get(t.id) ?? 0,
      captain_nick: captainByTeam.get(t.id) ?? null,
      last_results: (lastResultsSorted.get(t.id) ?? []).slice(0, 5),
      created_at: t.created_at,
    };
  }) as TeamWithStats[];
}

export async function getTeam(id: string): Promise<Team | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Team;
}

export async function getTeamWithMembership(
  teamId: string
): Promise<{ team: Team | null; role: "captain" | "member" | null }> {
  const supabase = await createClient();
  const [
    { data: { user } },
    { data: team, error: teamError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("teams").select("*").eq("id", teamId).single(),
  ]);
  if (teamError || !team) {
    return { team: null, role: null };
  }
  if (!user) {
    return { team: team as Team, role: null };
  }
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();
  const role = member?.role === "captain" ? "captain" : member?.role === "member" ? "member" : null;
  return { team: team as Team, role };
}

export async function getCurrentUserTeamIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);
  return (data ?? []).map((r) => r.team_id);
}

export async function getChallengesPendingForUserTeams(): Promise<
  (Challenge & { challenger_team?: Team; challenged_team?: Team })[]
> {
  const supabase = await createClient();
  const myTeamIds = await getCurrentUserTeamIds();
  if (myTeamIds.length === 0) return [];

  const { data: challenges, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("status", "pending")
    .in("challenged_team_id", myTeamIds)
    .order("created_at", { ascending: false });

  if (error || !challenges?.length) return [];

  const teamIds = [...new Set(challenges.flatMap((c) => [c.challenger_team_id, c.challenged_team_id]))];
  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, logo_url, city, mode")
    .in("id", teamIds);

  const teamsMap = new Map((teamsData ?? []).map((t) => [t.id, t as Team]));

  return challenges.map((c) => ({
    ...c,
    challenger_team: teamsMap.get(c.challenger_team_id) ?? null,
    challenged_team: teamsMap.get(c.challenged_team_id) ?? null,
  })) as (Challenge & { challenger_team?: Team; challenged_team?: Team })[];
}

export async function getTeamsWhereUserIsCaptain(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: members } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("role", "captain");
  if (!members?.length) return [];
  const teamIds = members.map((m) => m.team_id);
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .in("id", teamIds);
  return (teams ?? []).map((t) => ({ id: t.id, name: t.name }));
}

export async function getIsCurrentUserCaptain(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("role", "captain")
    .limit(1)
    .maybeSingle();
  return !!data;
}

export type TeamMemberWithProfile = {
  user_id: string;
  role: string;
  display_name: string | null;
  warface_nick: string | null;
};

export async function getTeamMembers(
  teamId: string
): Promise<TeamMemberWithProfile[]> {
  const supabase = await createClient();
  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("user_id, role")
    .eq("team_id", teamId);
  if (membersError || !members?.length) return [];
  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, warface_nick")
    .in("id", userIds);
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { display_name: p.display_name, warface_nick: p.warface_nick }])
  );
  return members.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    display_name: profileMap.get(m.user_id)?.display_name ?? null,
    warface_nick: profileMap.get(m.user_id)?.warface_nick ?? null,
  }));
}

export type TeamJoinRequestWithProfile = JoinRequest & {
  profile: Pick<Profile, "id" | "warface_nick" | "display_name" | "avatar_url">;
};

export async function getTeamJoinRequests(
  teamId: string
): Promise<TeamJoinRequestWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_join_requests")
    .select(
      `
      id,
      team_id,
      user_id,
      status,
      message,
      created_at,
      updated_at,
      profile:profiles(id, warface_nick, display_name, avatar_url)
    `
    )
    .eq("status", "pending")
    .or(`team_id.is.null,team_id.eq.${teamId}`)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as TeamJoinRequestWithProfile[];
}

// —— Team invitations ——
export async function getPendingInvitationsForCurrentUser(): Promise<
  (TeamInvitation & { team?: Team | null })[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("team_invitations")
    .select(
      `
      id,
      team_id,
      user_id,
      status,
      created_at,
      team:teams(id, name, logo_url)
    `
    )
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as unknown as (TeamInvitation & { team?: Team | null })[];
}

export async function createTeam(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const logo_url = (formData.get("logo_url") as string) || null;
  const { error } = await supabase.from("teams").insert({ name, logo_url });
  if (error) return { error: error.message };
  revalidatePath("/teams");
  return {};
}

// —— Tournaments ——
export async function getTournament(id: string): Promise<Tournament | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Tournament;
}

export async function getTournaments(): Promise<Tournament[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Tournament[];
}

export type TournamentWithDetails = Tournament & { registered_teams: number };

export async function getTournamentsWithDetails(): Promise<TournamentWithDetails[]> {
  const tournaments = await getTournaments();
  if (tournaments.length === 0) return [];

  const supabase = await createClient();
  const [{ data: regsV2 }, { data: regsLegacy }] = await Promise.all([
    supabase.from("tournament_teams").select("tournament_id"),
    supabase.from("tournament_registrations").select("tournament_id"),
  ]);

  const countByTournament = new Map<string, number>();
  (regsV2 ?? []).forEach((r) => {
    countByTournament.set(r.tournament_id, (countByTournament.get(r.tournament_id) ?? 0) + 1);
  });
  // если где-то ещё остались legacy регистрации — учтём их, но не задублируем
  (regsLegacy ?? []).forEach((r) => {
    countByTournament.set(r.tournament_id, (countByTournament.get(r.tournament_id) ?? 0) + 1);
  });

  return tournaments.map((t) => ({
    ...t,
    registered_teams: countByTournament.get(t.id) ?? 0,
  }));
}

export async function createTournament(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const game = (formData.get("game") as string) || null;
  const format = (formData.get("format") as string) || null;
  const maxTeamsRaw = (formData.get("max_teams") as string) || "";
  const max_teams =
    maxTeamsRaw && !Number.isNaN(Number(maxTeamsRaw))
      ? Number(maxTeamsRaw)
      : null;
  const start_date = (formData.get("start_date") as string) || null;
  const end_date = (formData.get("end_date") as string) || null;
  const status = (formData.get("status") as Tournament["status"]) || "upcoming";
  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      name,
      game,
      format: format || null,
      max_teams,
      start_date: start_date || null,
      end_date: end_date || null,
      status,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Не удалось создать турнир" };

  try {
    const { data: captains } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("role", "captain");

    const title = `Новый турнир: ${name}`;
    const message = `Новый турнир "${name}" открыт. Зарегистрируйте команду, чтобы участвовать.`;

    const { sendNotification } = await import("@/lib/notifications");

    (captains ?? []).forEach((m) => {
      void sendNotification(
        m.user_id as string,
        "tournament",
        title,
        message,
        `/tournaments/${data.id}`
      );
    });
  } catch {
    // уведомления не критичны
  }

  revalidatePath("/tournaments");
  redirect("/tournaments");
}

// —— Matches ——
export async function getMatches(): Promise<Match[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("scheduled_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Match[];
}

export async function getMatchesWithDetails(): Promise<
  (Match & { team1?: Team; team2?: Team; tournament?: Tournament })[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
      *,
      team1:teams!matches_team1_id_fkey(id, name, logo_url),
      team2:teams!matches_team2_id_fkey(id, name, logo_url),
      tournament:tournaments(id, name, game, status)
    `
    )
    .order("scheduled_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as (Match & {
    team1?: Team;
    team2?: Team;
    tournament?: Tournament;
  })[];
}

export async function getRecentMatchesWithDetails(limit = 50): Promise<
  (Match & { team1?: Team; team2?: Team; tournament?: Tournament })[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
      *,
      team1:teams!matches_team1_id_fkey(id, name, logo_url),
      team2:teams!matches_team2_id_fkey(id, name, logo_url),
      tournament:tournaments(id, name, game, status)
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as (Match & {
    team1?: Team;
    team2?: Team;
    tournament?: Tournament;
  })[];
}

export async function createMatch(formData: FormData) {
  const supabase = await createClient();
  const tournament_id = (formData.get("tournament_id") as string) || null;
  const team1_id = (formData.get("team1_id") as string) || null;
  const team2_id = (formData.get("team2_id") as string) || null;
  const status = (formData.get("status") as Match["status"]) || "scheduled";
  const score_team1 = parseInt((formData.get("score_team1") as string) || "0", 10);
  const score_team2 = parseInt((formData.get("score_team2") as string) || "0", 10);
  const scheduled_at = (formData.get("scheduled_at") as string) || null;
  const { data, error } = await supabase
    .from("matches")
    .insert({
    tournament_id,
    team1_id,
    team2_id,
    status,
    score_team1,
    score_team2,
    scheduled_at: scheduled_at || null,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Не удалось создать матч" };

  // Telegram: match_created for captains of both teams (if any)
  try {
    const { data: captains } = await supabase
      .from("team_members")
      .select("user_id")
      .in("team_id", [team1_id, team2_id].filter(Boolean));
    (captains ?? []).forEach((c) => {
      void enqueueTelegramNotification(c.user_id as string, "match_created", {
        match_id: data.id,
      });
    });
  } catch {
    // уведомления не критичны
  }

  revalidatePath("/matches");
  return {};
}

// —— Rankings ——
export async function getRankings(): Promise<
  (Ranking & { team?: Team; tournament?: Tournament })[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rankings")
    .select(
      `
      *,
      team:teams(id, name, logo_url),
      tournament:tournaments(id, name, game, status)
    `
    )
    .order("tournament_id")
    .order("rank");
  if (error) throw error;
  return (data ?? []) as (Ranking & {
    team?: Team;
    tournament?: Tournament;
  })[];
}

export async function getRankingsByTournament(
  tournamentId: string
): Promise<(Ranking & { team?: Team })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rankings")
    .select(
      `
      *,
      team:teams(id, name, logo_url)
    `
    )
    .eq("tournament_id", tournamentId)
    .order("rank");
  if (error) throw error;
  return (data ?? []) as (Ranking & { team?: Team })[];
}

// —— Rankings (global teams & players) ——
export type TeamRankingRow = {
  id: string;
  name: string;
  logo_url: string | null;
  points: number;
  wins: number;
  matches: number;
  last_results: ("win" | "loss")[];
};

export async function getTeamsRanking(limit = 100): Promise<TeamRankingRow[]> {
  const teamsWithStats = await getTeamsWithStats();
  return teamsWithStats
    .map((t) => ({
      id: t.id,
      name: t.name,
      logo_url: t.logo_url,
      points: t.points,
      wins: t.wins,
      matches: t.total_matches,
      last_results: t.last_results,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

export type PlayerRankingRow = {
  id: string;
  warface_nick: string | null;
  points: number;
  wins: number;
  team_name: string | null;
  avatar_url: string | null;
  is_free_agent: boolean;
};

export async function getPlayersRankingByPeriod(
  limit: number,
  days: number
): Promise<PlayerRankingRow[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: history } = await supabase
    .from("profile_points_history")
    .select("profile_id, delta")
    .gte("created_at", since.toISOString());

  const pointsByUser = new Map<string, number>();
  (history ?? []).forEach((h) => {
    pointsByUser.set(h.profile_id, (pointsByUser.get(h.profile_id) ?? 0) + (h.delta ?? 0));
  });

  const userIds = [...pointsByUser.keys()].slice(0, limit * 2);
  if (userIds.length === 0) return [];

  const [{ data: profiles }, { data: members }, { data: teams }] = await Promise.all([
    supabase.from("profiles").select("id, warface_nick, display_name, avatar_url").in("id", userIds),
    supabase.from("team_members").select("user_id, team_id"),
    supabase.from("teams").select("id, name"),
  ]);

  const teamById = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const teamByUser = new Map<string, string>();
  (members ?? []).forEach((m) => {
    const name = teamById.get(m.team_id) ?? null;
    if (name) teamByUser.set(m.user_id, name);
  });

  return (profiles ?? [])
    .filter((p) => (pointsByUser.get(p.id) ?? 0) > 0)
    .map((p) => ({
      id: p.id,
      warface_nick: p.warface_nick ?? p.display_name ?? null,
      points: pointsByUser.get(p.id) ?? 0,
      wins: 0,
      team_name: teamByUser.get(p.id) ?? null,
      avatar_url: p.avatar_url ?? null,
      is_free_agent: !teamByUser.get(p.id),
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

export async function getTeamsRankingByPeriod(
  limit: number,
  days: number
): Promise<TeamRankingRow[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: history } = await supabase
    .from("team_points_history")
    .select("team_id, delta")
    .gte("created_at", since.toISOString());

  const pointsByTeam = new Map<string, number>();
  (history ?? []).forEach((h) => {
    pointsByTeam.set(h.team_id, (pointsByTeam.get(h.team_id) ?? 0) + (h.delta ?? 0));
  });

  const teamIds = [...pointsByTeam.keys()];
  if (teamIds.length === 0) return [];

  const { data: teams } = await supabase.from("teams").select("*").in("id", teamIds);
  const winsByTeam = new Map<string, number>();
  const { data: matches } = await supabase
    .from("matches")
    .select("team1_id, team2_id, score_team1, score_team2")
    .eq("status", "completed")
    .gte("completed_at", since.toISOString());

  (matches ?? []).forEach((m) => {
    if (!m.team1_id || !m.team2_id) return;
    const t1Won = (m.score_team1 ?? 0) > (m.score_team2 ?? 0);
    winsByTeam.set(m.team1_id, (winsByTeam.get(m.team1_id) ?? 0) + (t1Won ? 1 : 0));
    winsByTeam.set(m.team2_id, (winsByTeam.get(m.team2_id) ?? 0) + (t1Won ? 0 : 1));
  });

  return (teams ?? [])
    .filter((t) => (pointsByTeam.get(t.id) ?? 0) > 0)
    .map((t) => ({
      id: t.id,
      name: t.name,
      logo_url: t.logo_url,
      points: pointsByTeam.get(t.id) ?? 0,
      wins: winsByTeam.get(t.id) ?? 0,
      matches: 0,
      last_results: [],
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

export async function getPlayersRanking(limit = 100): Promise<PlayerRankingRow[]> {
  const supabase = await createClient();
  const [
    { data: profiles },
    { data: members },
    { data: teams },
  ] = await Promise.all([
    supabase.from("profiles").select("id, warface_nick, display_name, points, avatar_url"),
    supabase.from("team_members").select("user_id, team_id"),
    supabase.from("teams").select("id, name"),
  ]);

  const teamById = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const teamByUser = new Map<string, string>();
  (members ?? []).forEach((m) => {
    const name = teamById.get(m.team_id) ?? null;
    if (name) teamByUser.set(m.user_id, name);
  });

  return (profiles ?? [])
    .map((p) => {
      const nick = p.warface_nick ?? p.display_name ?? null;
      const teamName = teamByUser.get(p.id) ?? null;
      return {
        id: p.id,
        warface_nick: nick,
        points: p.points ?? 0,
        wins: 0,
        team_name: teamName,
        avatar_url: p.avatar_url ?? null,
        is_free_agent: !teamName,
      };
    })
    .filter((p) => p.warface_nick)
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

export async function createRanking(formData: FormData) {
  const supabase = await createClient();
  const tournament_id = formData.get("tournament_id") as string;
  const team_id = formData.get("team_id") as string;
  const rank = parseInt(formData.get("rank") as string, 10);
  const points = parseInt((formData.get("points") as string) || "0", 10);
  const wins = parseInt((formData.get("wins") as string) || "0", 10);
  const losses = parseInt((formData.get("losses") as string) || "0", 10);
  const { error } = await supabase.from("rankings").insert({
    tournament_id,
    team_id,
    rank,
    points,
    wins,
    losses,
  });
  if (error) return { error: error.message };
  revalidatePath("/rankings");
  return {};
}
