import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPredictionsLockAt, isLockedAt } from '@/lib/predictions-lock';
import { PredictionView } from '../../pronosticos/PredictionView';
import { displayName } from '../shared';
import type { Match, Team } from '@/lib/types/match';
import type {
  Prediction,
  PredictionBracketEntry,
  PredictionGroupScore,
} from '@/lib/types/prediction';

export const metadata = { title: 'Pronóstico · Comunidad' };

export default async function ComunidadUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Antes del lock no se pueden ver pronósticos de otros → al gate.
  const lockAt = await getPredictionsLockAt();
  if (!isLockedAt(lockAt)) redirect('/comunidad');

  const [predictionResult, scoresResult, bracketResult, matchesResult, teamsResult, profileResult] =
    await Promise.all([
      supabase.from('predictions').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('prediction_group_scores').select('*').eq('user_id', userId),
      supabase.from('prediction_bracket').select('*').eq('user_id', userId),
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
      supabase
        .from('teams')
        .select('code, name, flag, group_code')
        .not('group_code', 'is', null)
        .order('group_code', { ascending: true }),
      supabase
        .from('public_profiles')
        .select('id, nickname, first_name, last_name')
        .eq('id', userId)
        .maybeSingle(),
    ]);

  const profile = profileResult.data as
    | { nickname: string | null; first_name: string | null; last_name: string | null }
    | null;
  const ownerName = profile ? displayName(profile) : null;

  if (!ownerName) {
    return (
      <div className="max-w-xl mx-auto px-5 py-16 text-center flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Jugador no encontrado</h1>
        <Link href="/comunidad" className="text-sm text-tertiary hover:underline">
          ← Volver a Comunidad
        </Link>
      </div>
    );
  }

  const prediction = (predictionResult.data ?? null) as Prediction | null;
  const groupScores = (scoresResult.data ?? []) as PredictionGroupScore[];
  const bracket = (bracketResult.data ?? []) as PredictionBracketEntry[];
  const teams = (teamsResult.data ?? []) as Team[];

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
    <div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <Link
          href="/comunidad"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Comunidad
        </Link>
      </div>
      <PredictionView
        prediction={prediction}
        groupScores={groupScores}
        bracket={bracket}
        groupMatches={groupMatches}
        teams={teams}
        isSubmitted={prediction?.locked_at != null}
        isLocked
        ownerName={ownerName}
      />
    </div>
  );
}
