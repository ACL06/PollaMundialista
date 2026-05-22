export interface Team {
  code: string;
  name: string;
  flag: string;
  group_code: string | null;
}

export type MatchStatus = 'scheduled' | 'live' | 'final';
export type MatchStage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final';

export interface Match {
  id: string;
  match_number: number;
  stage: MatchStage;
  group_code: string | null;
  home_team: Team;
  away_team: Team;
  kicks_off_at: string;
  venue: string;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
}
