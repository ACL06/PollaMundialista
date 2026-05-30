import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminPanel } from './AdminPanel';
import type { Match } from '@/lib/types/match';

export const metadata = { title: 'Panel admin' };

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Gate: solo admins. Si no lo es (o la columna aún no existe), a /home.
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect('/home');

  const [matchesResult, settingsResult] = await Promise.all([
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
    supabase.from('tournament_settings').select('top_scorer').eq('id', 1).maybeSingle(),
  ]);

  const groupMatches = (matchesResult.data ?? []).map((row) => {
    const homeTeam = Array.isArray(row.home_team)
      ? (row.home_team[0] ?? null)
      : (row.home_team ?? null);
    const awayTeam = Array.isArray(row.away_team)
      ? (row.away_team[0] ?? null)
      : (row.away_team ?? null);
    return { ...row, home_team: homeTeam, away_team: awayTeam };
  }) as unknown as Match[];

  const initialTopScorer = (settingsResult.data?.top_scorer as string | undefined) ?? null;

  return <AdminPanel groupMatches={groupMatches} initialTopScorer={initialTopScorer} />;
}
