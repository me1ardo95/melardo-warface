export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  warface_nick?: string | null;
  avatar_url: string | null;
  points?: number;
  rank?: number | null;
  trust_score?: number | null;
  invite_code?: string | null;
  created_at: string;
  updated_at: string;
  role?: "admin" | "user" | null;
};

export type Team = {
  id: string;
  name: string;
  logo_url: string | null;
  city?: string | null;
  description?: string | null;
  mode?: string | null;
  clan_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type Tournament = {
  id: string;
  name: string;
  game: string | null;
  format?: string | null;
  max_teams?: number | null;
  current_teams?: number | null;
  type?: "daily" | "weekly" | "monthly" | "clan" | null;
  start_date: string | null;
  start_time?: string | null;
  end_date: string | null;
  status:
    | "upcoming"
    | "ongoing"
    | "completed"
    | "cancelled"
    | "registration"
    | "starting"
    | "active"
    | "finished";
  bracket_data?: unknown | null;
  created_at: string;
  updated_at: string;
};

export type Match = {
  id: string;
  tournament_id: string | null;
  team1_id: string | null;
  team2_id: string | null;
  status: "scheduled" | "live" | "awaiting_result" | "completed" | "cancelled" | "postponed" | "disputed" | "auto_resolved";
  score_team1: number;
  score_team2: number;
  scheduled_at: string | null;
  completed_at: string | null;
  screenshot_url?: string | null;
  created_at: string;
  updated_at: string;
  teams?: { team1?: Team; team2?: Team } | null;
  tournament?: Tournament | null;
};

export type Ranking = {
  id: string;
  tournament_id: string;
  team_id: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  created_at: string;
  updated_at: string;
  team?: Team | null;
  tournament?: Tournament | null;
};

export type TournamentRequestStatus = "pending" | "approved" | "rejected";

export type TournamentRequest = {
  id: string;
  user_id: string;
  title: string;
  mode: "5x5" | "8x8";
  format: "single_elimination" | "round_robin";
  min_teams: number | null;
  max_teams: number | null;
  requested_date: string | null;
  comment: string | null;
  status: TournamentRequestStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type PlayerProfile = Profile & {
  wins?: number;
  losses?: number;
  matches_played?: number;
  achievements?: string[] | null;
  current_team?: Team | null;
};

export type JoinRequestStatus = "pending" | "approved" | "rejected";

export type JoinRequest = {
  id: string;
  team_id: string | null;
  user_id: string;
  status: JoinRequestStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchConfirmationStatus =
  | "pending"
  | "confirmed"
  | "disputed";

export type MatchConfirmation = {
  id: string;
  match_id: string;
  captain_id: string;
  team_id: string;
  score_team1: number;
  score_team2: number;
  screenshot_url: string;
  status: MatchConfirmationStatus;
  created_at: string;
  updated_at: string;
};

export type TeamInvitation = {
  id: string;
  team_id: string;
  user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  team?: Team | null;
};

export type Challenge = {
  id: string;
  challenger_team_id: string;
  challenged_team_id: string;
  tournament_id: string | null;
  match_id: string | null;
  status: "pending" | "accepted" | "rejected" | "expired";
  message: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  challenger_team?: Team | null;
  challenged_team?: Team | null;
};

export type NotificationType =
  | "tournament"
  | "invite"
  | "challenge"
  | "team_join"
  | "match_result"
  | "match_confirm"
  | "tournament_start"
  | "match_scheduled"
  | "mission_completed"
  | "clan_invite"
  | "clan_war_started"
  | "clan_war_won";

export type Notification = {
  id: string;
  user_id: string | null;
  team_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

export type PublicChallengeStatus = "active" | "accepted" | "cancelled";

export type PublicChallenge = {
  id: string;
  team_id: string;
  mode: "3x3" | "4x4" | "5x5" | "6x6" | "7x7" | "8x8";
  map?: string | null;
  scheduled_at: string | null;
  comment: string | null;
  status: PublicChallengeStatus;
  match_id: string | null;
  created_at: string;
};

export type PublicChallengeCreate = {
  team_id: string;
  mode: "5x5" | "8x8";
  scheduled_at: string | null;
  comment?: string | null;
};

export type PublicChallengeAccept = {
  challenge_id: string;
  team_id: string;
};

// —— Referrals ——

export type ReferralStatus = "pending" | "approved" | "rejected";

export type Referral = {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  status: ReferralStatus;
  created_at: string;
  approved_at: string | null;
  admin_notes: string | null;
};

// —— Seasons & archive ——

export type Season = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

export type SeasonArchive = {
  id: string;
  season_id: string;
  team_id: string;
  final_rank: number;
  final_points: number;
  stats: unknown | null;
};

export type RankDivision = {
  id: string;
  name: string;
  min_rating: number;
  max_rating: number | null;
  icon: string | null;
};

// —— Clans ——

export type ClanRole = "owner" | "captain" | "member";

export type Clan = {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  logo_url: string | null;
  owner_id: string;
  rating: number;
  created_at: string;
};

export type ClanMember = {
  id: string;
  clan_id: string;
  user_id: string;
  role: ClanRole;
  joined_at: string;
};

export type ClanInviteStatus = "pending" | "accepted" | "declined";

export type ClanInvite = {
  id: string;
  clan_id: string;
  user_id: string;
  invited_by: string;
  status: ClanInviteStatus;
  created_at: string;
};

export type ClanWarStatus = "pending" | "active" | "finished";
export type ClanWarFormat = "BO1" | "BO3" | "BO5";

export type ClanWar = {
  id: string;
  clan1_id: string;
  clan2_id: string;
  status: ClanWarStatus;
  format: ClanWarFormat;
  winner_clan_id: string | null;
  created_at: string;
};

export type ClanSeason = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

// —— Donations ——

export type DonationStatus = "pending" | "confirmed" | "rejected";

export type Donation = {
  id: string;
  user_id: string | null;
  team_id: string | null;
  amount: number;
  points_awarded: number;
  status: DonationStatus;
  proof_url: string | null;
  admin_notes: string | null;
  comment?: string | null;
  created_at: string;
  confirmed_at: string | null;
};

