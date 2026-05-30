import { createClient } from '@/lib/supabase/server';
import { getPredictionsLockAt, isLockedAt } from '@/lib/predictions-lock';
import { buildRanking, deriveOfficialResults } from '@/lib/scoring';
import { displayName } from '@/lib/display-name';
import type { Match } from '@/lib/types/match';
import type {
  Prediction,
  PredictionBracketEntry,
  PredictionGroupScore,
} from '@/lib/types/prediction';
import type { RankingRow } from './types';

interface RankingProfile {
  id: string;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface RankingResult {
  lockAt: Date | null;
  locked: boolean;
  hasResults: boolean;
  rows: RankingRow[];
}

/**
 * Carga y computa el ranking completo. Compartido por /ranking y /home
 * (para "Tu posición"). El desempate es **alfabético por nombre y
 * apellidos**; las posiciones usan ranking de competición (empates
 * comparten número). Solo tiene sentido post-lock.
 */
export async function loadRanking(): Promise<RankingResult> {
  const supabase = await createClient();
  const lockAt = await getPredictionsLockAt();

  if (!isLockedAt(lockAt)) {
    return { lockAt, locked: false, hasResults: false, rows: [] };
  }

  const [predsRes, scoresRes, bracketRes, matchesRes, profilesRes, settingsRes] =
    await Promise.all([
      supabase.from('predictions').select('*'),
      supabase.from('prediction_group_scores').select('user_id, match_id, home_score, away_score'),
      supabase.from('prediction_bracket').select('user_id, round, team_code'),
      supabase
        .from('matches')
        .select(
          `
          id, match_number, stage, group_code,
          bracket_source_home, bracket_source_away,
          kicks_off_at, venue, home_score, away_score, status,
          home_team:teams!matches_home_team_code_fkey(code, name, flag, group_code),
          away_team:teams!matches_away_team_code_fkey(code, name, flag, group_code)
        `,
        )
        .order('match_number', { ascending: true }),
      supabase.from('public_profiles').select('id, nickname, first_name, last_name, avatar_url'),
      supabase.from('tournament_settings').select('top_scorer').eq('id', 1).maybeSingle(),
    ]);

  const predictions = (predsRes.data ?? []) as Prediction[];
  const groupScores = (scoresRes.data ?? []) as PredictionGroupScore[];
  const bracket = (bracketRes.data ?? []) as PredictionBracketEntry[];
  const profiles = (profilesRes.data ?? []) as RankingProfile[];

  const matches = (matchesRes.data ?? []).map((row) => {
    const homeTeam = Array.isArray(row.home_team)
      ? (row.home_team[0] ?? null)
      : (row.home_team ?? null);
    const awayTeam = Array.isArray(row.away_team)
      ? (row.away_team[0] ?? null)
      : (row.away_team ?? null);
    return { ...row, home_team: homeTeam, away_team: awayTeam };
  }) as unknown as Match[];

  const officialTopScorer = (settingsRes.data?.top_scorer as string | undefined) ?? null;
  const official = deriveOfficialResults(matches, officialTopScorer);
  const hasResults = matches.some((m) => m.status === 'final');

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  // Resolver nombre/avatar, y ordenar por puntos desc → nombre asc (desempate).
  const sorted = buildRanking(predictions, groupScores, bracket, official)
    .map((entry) => {
      const profile = profileById.get(entry.userId);
      return {
        userId: entry.userId,
        name: displayName(profile ?? {}),
        avatarUrl: profile?.avatar_url ?? null,
        breakdown: entry.breakdown,
      };
    })
    .sort((a, b) => b.breakdown.total - a.breakdown.total || a.name.localeCompare(b.name));

  // Asignar posiciones de competición (empates comparten número).
  let lastTotal = Number.POSITIVE_INFINITY;
  let lastRank = 0;
  const rows: RankingRow[] = sorted.map((r, i) => {
    const rank = r.breakdown.total === lastTotal ? lastRank : i + 1;
    lastTotal = r.breakdown.total;
    lastRank = rank;
    return { ...r, rank };
  });

  return { lockAt, locked: true, hasResults, rows };
}
