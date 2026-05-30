import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPredictionsLockAt } from '@/lib/predictions-lock';
import { PredictionWizard } from './PredictionWizard';
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

  // Carga en paralelo: pronóstico principal, marcadores, bracket y lock-at.
  // RLS filtra automáticamente por auth.uid() = user_id en las 3 tablas.
  const [predictionResult, scoresResult, bracketResult, lockAt] = await Promise.all([
    supabase.from('predictions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('prediction_group_scores').select('*').eq('user_id', user.id),
    supabase.from('prediction_bracket').select('*').eq('user_id', user.id),
    getPredictionsLockAt(),
  ]);

  const prediction = (predictionResult.data ?? null) as Prediction | null;
  const groupScores = (scoresResult.data ?? []) as PredictionGroupScore[];
  const bracket = (bracketResult.data ?? []) as PredictionBracketEntry[];

  return (
    <PredictionWizard
      initialPrediction={prediction}
      initialGroupScores={groupScores}
      initialBracket={bracket}
      lockAt={lockAt?.toISOString() ?? null}
    />
  );
}
