import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminPanel } from './AdminPanel';
import type { EnrollmentUser } from './EnrollmentEditor';
import type { Match, Team } from '@/lib/types/match';

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

  const [matchesResult, teamsResult, settingsResult, enrollmentResult] = await Promise.all([
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
      .from('teams')
      .select('code, name, flag, group_code')
      .not('group_code', 'is', null)
      .order('group_code', { ascending: true }),
    supabase.from('tournament_settings').select('top_scorer').eq('id', 1).maybeSingle(),
    supabase
      .from('public_profiles')
      .select('id, nickname, first_name, last_name, avatar_url, is_enrolled'),
  ]);

  const allMatches = (matchesResult.data ?? []).map((row) => {
    const homeTeam = Array.isArray(row.home_team)
      ? (row.home_team[0] ?? null)
      : (row.home_team ?? null);
    const awayTeam = Array.isArray(row.away_team)
      ? (row.away_team[0] ?? null)
      : (row.away_team ?? null);
    return { ...row, home_team: homeTeam, away_team: awayTeam };
  }) as unknown as Match[];

  const groupMatches = allMatches.filter((m) => m.stage === 'group');
  const knockoutMatches = allMatches.filter((m) => m.stage !== 'group');
  const teams = (teamsResult.data ?? []) as Team[];
  const initialTopScorer = (settingsResult.data?.top_scorer as string | undefined) ?? null;
  const enrollmentUsers = (enrollmentResult.data ?? []) as EnrollmentUser[];

  return (
    <AdminPanel
      groupMatches={groupMatches}
      knockoutMatches={knockoutMatches}
      teams={teams}
      initialTopScorer={initialTopScorer}
      enrollmentUsers={enrollmentUsers}
    />
  );
}
