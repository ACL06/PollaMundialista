import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPredictionsLockAt, isLockedAt } from '@/lib/predictions-lock';
import { KNOCKOUT_SCORE_STAGES } from '@/lib/knockout-window';
import { PredictionWizard } from './PredictionWizard';
import { PredictionView } from './PredictionView';
import { PronosticosTabs } from './PronosticosTabs';
import { KnockoutScoresPanel } from './KnockoutScoresPanel';
import type { Match, Team } from '@/lib/types/match';
import type {
  Prediction,
  PredictionBracketEntry,
  PredictionGroupScore,
  PredictionKnockoutScore,
} from '@/lib/types/prediction';

export const metadata = { title: 'Pronósticos' };

// Select reutilizado para traer partidos con sus equipos (o null en eliminatorias).
const MATCH_SELECT = `
  id, match_number, stage, group_code,
  bracket_source_home, bracket_source_away,
  kicks_off_at, venue, home_score, away_score, status,
  home_team:teams!matches_home_team_code_fkey(code, name, flag, group_code),
  away_team:teams!matches_away_team_code_fkey(code, name, flag, group_code)
`;

/** Normaliza home_team/away_team a object (Supabase a veces los trae como array). */
function normalizeMatches(rows: unknown[]): Match[] {
  return (rows ?? []).map((raw) => {
    const row = raw as Record<string, unknown> & { home_team: unknown; away_team: unknown };
    const homeTeam = Array.isArray(row.home_team) ? (row.home_team[0] ?? null) : (row.home_team ?? null);
    const awayTeam = Array.isArray(row.away_team) ? (row.away_team[0] ?? null) : (row.away_team ?? null);
    return { ...row, home_team: homeTeam, away_team: awayTeam };
  }) as unknown as Match[];
}

export default async function PronosticosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Carga en paralelo: pronóstico principal, marcadores, bracket, partidos de
  // grupos, partidos de eliminatoria, marcadores de eliminatoria, equipos y
  // lock-at. RLS filtra por auth.uid() en las tablas de predicción.
  const [
    predictionResult,
    scoresResult,
    bracketResult,
    matchesResult,
    knockoutMatchesResult,
    knockoutScoresResult,
    teamsResult,
    lockAt,
  ] = await Promise.all([
    supabase.from('predictions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('prediction_group_scores').select('*').eq('user_id', user.id),
    supabase.from('prediction_bracket').select('*').eq('user_id', user.id),
    supabase
      .from('matches')
      .select(MATCH_SELECT)
      .eq('stage', 'group')
      .order('kicks_off_at', { ascending: true }),
    supabase
      .from('matches')
      .select(MATCH_SELECT)
      .in('stage', [...KNOCKOUT_SCORE_STAGES])
      .order('match_number', { ascending: true }),
    supabase.from('prediction_knockout_scores').select('*').eq('user_id', user.id),
    supabase
      .from('teams')
      .select('code, name, flag, group_code')
      .not('group_code', 'is', null)
      .order('group_code', { ascending: true }),
    getPredictionsLockAt(),
  ]);

  const prediction = (predictionResult.data ?? null) as Prediction | null;
  const groupScores = (scoresResult.data ?? []) as PredictionGroupScore[];
  const bracket = (bracketResult.data ?? []) as PredictionBracketEntry[];
  const teams = (teamsResult.data ?? []) as Team[];
  const groupMatches = normalizeMatches(matchesResult.data ?? []);
  const knockoutMatches = normalizeMatches(knockoutMatchesResult.data ?? []);
  const knockoutScores = (knockoutScoresResult.data ?? []) as PredictionKnockoutScore[];

  // Si ya envió (one-shot) o el plazo global cerró → vista de solo lectura del
  // pronóstico principal. En otro caso, el wizard editable.
  const isSubmitted = prediction?.locked_at != null;
  const isLocked = isLockedAt(lockAt);

  const miPronostico =
    isSubmitted || isLocked ? (
      <PredictionView
        prediction={prediction}
        groupScores={groupScores}
        bracket={bracket}
        groupMatches={groupMatches}
        teams={teams}
        isSubmitted={isSubmitted}
        isLocked={isLocked}
      />
    ) : (
      <PredictionWizard
        initialPrediction={prediction}
        initialGroupScores={groupScores}
        initialBracket={bracket}
        groupMatches={groupMatches}
        teams={teams}
        lockAt={lockAt?.toISOString() ?? null}
      />
    );

  return (
    <PronosticosTabs
      miPronostico={miPronostico}
      eliminatorias={
        <KnockoutScoresPanel
          matches={knockoutMatches}
          initialScores={knockoutScores}
          nowIso={new Date().toISOString()}
        />
      }
    />
  );
}
