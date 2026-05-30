import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPredictionsLockAt, isLockedAt } from '@/lib/predictions-lock';
import { Countdown } from '@/components/pronosticos/Countdown';
import { buildRanking, deriveOfficialResults } from '@/lib/scoring';
import { displayName } from '@/lib/display-name';
import { RankingView, type RankingRow } from './RankingView';
import type { Match } from '@/lib/types/match';
import type {
  Prediction,
  PredictionBracketEntry,
  PredictionGroupScore,
} from '@/lib/types/prediction';

export const metadata = { title: 'Ranking' };

interface RankingProfile {
  id: string;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const lockAt = await getPredictionsLockAt();

  // El ranking se abre con el lock (sin resultados, no tiene sentido, y
  // además los pronósticos de otros solo son legibles post-lock).
  if (!isLockedAt(lockAt)) {
    return (
      <div className="max-w-xl mx-auto px-5 py-16 text-center flex flex-col items-center gap-5">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Ranking</h1>
        <p className="text-muted-foreground">
          El ranking se activa cuando arranca el Mundial y empiezan a registrarse resultados.
        </p>
        {lockAt && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Se activa en
            </p>
            <Countdown targetIsoDate={lockAt.toISOString()} />
          </div>
        )}
      </div>
    );
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
  const ranking = buildRanking(predictions, groupScores, bracket, official);
  const hasResults = matches.some((m) => m.status === 'final');

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  // Asignar posiciones con ranking de competición (empates comparten número).
  let lastTotal = Number.POSITIVE_INFINITY;
  let lastRank = 0;
  const rows: RankingRow[] = ranking.map((entry, i) => {
    const total = entry.breakdown.total;
    const rank = total === lastTotal ? lastRank : i + 1;
    lastTotal = total;
    lastRank = rank;
    const profile = profileById.get(entry.userId);
    return {
      userId: entry.userId,
      name: displayName(profile ?? {}),
      avatarUrl: profile?.avatar_url ?? null,
      breakdown: entry.breakdown,
      rank,
    };
  });

  return <RankingView rows={rows} currentUserId={user.id} hasResults={hasResults} />;
}
