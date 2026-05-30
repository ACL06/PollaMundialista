import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPredictionsLockAt } from '@/lib/predictions-lock';
import { PredictionWizard } from './PredictionWizard';
import type { Match } from '@/lib/types/match';
import type {
  Prediction,
  PredictionBracketEntry,
  PredictionGroupScore,
} from '@/lib/types/prediction';

export const metadata = { title: 'Pronósticos' };

export default async function PronosticosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Carga en paralelo: pronóstico principal, marcadores, bracket,
  // partidos de fase de grupos y lock-at. RLS filtra automáticamente
  // por auth.uid() = user_id en las tablas de predicción.
  const [predictionResult, scoresResult, bracketResult, matchesResult, lockAt] =
    await Promise.all([
      supabase.from('predictions').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('prediction_group_scores').select('*').eq('user_id', user.id),
      supabase.from('prediction_bracket').select('*').eq('user_id', user.id),
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
        .eq('stage', 'group')
        .order('kicks_off_at', { ascending: true }),
      getPredictionsLockAt(),
    ]);

  const prediction = (predictionResult.data ?? null) as Prediction | null;
  const groupScores = (scoresResult.data ?? []) as PredictionGroupScore[];
  const bracket = (bracketResult.data ?? []) as PredictionBracketEntry[];

  // Normaliza home_team/away_team a object (Supabase a veces los trae como array).
  const groupMatches = (matchesResult.data ?? []).map((row) => {
    const homeTeam = Array.isArray(row.home_team)
      ? (row.home_team[0] ?? null)
      : (row.home_team ?? null);
    const awayTeam = Array.isArray(row.away_team)
      ? (row.away_team[0] ?? null)
      : (row.away_team ?? null);
    return { ...row, home_team: homeTeam, away_team: awayTeam };
  }) as unknown as Match[];

  return (
    <PredictionWizard
      initialPrediction={prediction}
      initialGroupScores={groupScores}
      initialBracket={bracket}
      groupMatches={groupMatches}
      lockAt={lockAt?.toISOString() ?? null}
    />
  );
}
