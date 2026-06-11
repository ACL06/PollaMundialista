import { createClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/supabase/fetch-all';
import { getPredictionsLockAt, isLockedAt } from '@/lib/predictions-lock';
import { assignRanks, buildRanking, deriveOfficialResults } from '@/lib/scoring';
import { displayName } from '@/lib/display-name';
import type { Match } from '@/lib/types/match';
import type {
  Prediction,
  PredictionBracketEntry,
  PredictionGroupScore,
  PredictionKnockoutScore,
} from '@/lib/types/prediction';
import type { RankingRow } from './types';

interface RankingProfile {
  id: string;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_enrolled: boolean;
}

export interface RankingResult {
  lockAt: Date | null;
  locked: boolean;
  hasResults: boolean;
  /** True cuando el torneo terminó (la final ya tiene campeón) → podio definitivo. */
  complete: boolean;
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
    return { lockAt, locked: false, hasResults: false, complete: false, rows: [] };
  }

  // Lecturas globales (todas las filas de todos los usuarios) → fetchAll:
  // superan el "Max Rows" de PostgREST y se truncarían en silencio. El
  // `.order()` por PK es requisito de la paginación (páginas estables).
  const [predsRes, scoresRes, bracketRes, knockoutScoresRes, matchesRes, profilesRes, settingsRes] =
    await Promise.all([
      fetchAll(() => supabase.from('predictions').select('*').order('user_id')),
      fetchAll(() =>
        supabase
          .from('prediction_group_scores')
          .select('user_id, match_id, home_score, away_score')
          .order('user_id')
          .order('match_id'),
      ),
      fetchAll(() =>
        supabase
          .from('prediction_bracket')
          .select('user_id, round, team_code')
          .order('user_id')
          .order('round')
          .order('team_code'),
      ),
      fetchAll(() =>
        supabase
          .from('prediction_knockout_scores')
          .select('user_id, match_id, home_score, away_score')
          .order('user_id')
          .order('match_id'),
      ),
      supabase
        .from('matches')
        .select(
          `
          id, match_number, stage, group_code,
          bracket_source_home, bracket_source_away,
          kicks_off_at, venue, home_score, away_score, winner_code, status,
          home_team:teams!matches_home_team_code_fkey(code, name, flag, group_code),
          away_team:teams!matches_away_team_code_fkey(code, name, flag, group_code)
        `,
        )
        .order('match_number', { ascending: true }),
      supabase
        .from('public_profiles')
        .select('id, nickname, first_name, last_name, avatar_url, is_enrolled'),
      supabase.from('tournament_settings').select('top_scorer').eq('id', 1).maybeSingle(),
    ]);

  const allProfiles = (profilesRes.data ?? []) as RankingProfile[];
  // #3: solo los INSCRITOS aparecen en el ranking; los pre-inscritos quedan
  // fuera una vez arrancado el Mundial.
  const enrolledIds = new Set(allProfiles.filter((p) => p.is_enrolled).map((p) => p.id));
  const isEnrolled = (row: { user_id: string }) => enrolledIds.has(row.user_id);

  const predictions = ((predsRes.data ?? []) as Prediction[]).filter(isEnrolled);
  const groupScores = ((scoresRes.data ?? []) as PredictionGroupScore[]).filter(isEnrolled);
  const bracket = ((bracketRes.data ?? []) as PredictionBracketEntry[]).filter(isEnrolled);
  const knockoutScores = ((knockoutScoresRes.data ?? []) as PredictionKnockoutScore[]).filter(
    isEnrolled,
  );
  const profiles = allProfiles.filter((p) => p.is_enrolled);

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
  // Torneo terminado = ya hay campeón (la final, último partido, está finalizada).
  const complete = official.champion != null;

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  // Resolver nombre/avatar, y ordenar por puntos desc → nombre asc (desempate).
  // Se pasan TODOS los ids inscritos: quien no haya guardado nada aparece
  // igual con 0 pts (pagó y concursa; el "de N" cuadra con los inscritos).
  const enrolledUserIds = profiles.map((p) => p.id);
  const sorted = buildRanking(
    predictions,
    groupScores,
    bracket,
    knockoutScores,
    official,
    enrolledUserIds,
  )
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

  // Posiciones de competición (empates comparten número) — helper puro testeado.
  const rows: RankingRow[] = assignRanks(sorted);

  return { lockAt, locked: true, hasResults, complete, rows };
}
