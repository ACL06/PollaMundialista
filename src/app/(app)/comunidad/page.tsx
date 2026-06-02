import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPredictionsLockAt, isLockedAt } from '@/lib/predictions-lock';
import { Countdown } from '@/components/pronosticos/Countdown';
import { CommunityView } from './CommunityView';
import {
  displayName,
  type ChampionPick,
  type CommunityScore,
  type PublicProfile,
  type ReactionRow,
} from './shared';
import type { Match, Team } from '@/lib/types/match';

export const metadata = { title: 'Comunidad' };

export default async function ComunidadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const lockAt = await getPredictionsLockAt();
  const locked = isLockedAt(lockAt);

  // Gate: antes del lock, los pronósticos de otros NO se muestran (para
  // que nadie copie). Solo se abren cuando arranca el Mundial.
  if (!locked) {
    return (
      <div className="max-w-xl mx-auto px-5 py-16 text-center flex flex-col items-center gap-5">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Comunidad</h1>
        <p className="text-muted-foreground">
          Los pronósticos de todos se abren cuando arranca el Mundial — así nadie puede copiar
          antes del cierre. Vuelve cuando empiece el primer partido.
        </p>
        {lockAt && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Se abre en
            </p>
            <Countdown targetIsoDate={lockAt.toISOString()} />
          </div>
        )}
      </div>
    );
  }

  // Post-lock: lectura pública habilitada por RLS.
  const [
    matchesResult,
    scoresResult,
    predictionsResult,
    profilesResult,
    teamsResult,
    reactionsResult,
  ] = await Promise.all([
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
        .from('prediction_group_scores')
        .select('user_id, match_id, home_score, away_score'),
      supabase.from('predictions').select('user_id, champion_code'),
      supabase
        .from('public_profiles')
        .select('id, nickname, first_name, last_name, avatar_url, favorite_team, is_enrolled'),
      supabase
        .from('teams')
        .select('code, name, flag, group_code')
        .not('group_code', 'is', null),
      supabase
        .from('prediction_reactions')
        .select('reactor_id, target_user_id, match_id, reaction'),
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

  const allProfiles = (profilesResult.data ?? []) as PublicProfile[];
  // #3: post-lock solo se muestran los INSCRITOS; los pre-inscritos y su info
  // desaparecen de Comunidad.
  const enrolledIds = new Set(allProfiles.filter((p) => p.is_enrolled).map((p) => p.id));
  const profiles = allProfiles.filter((p) => p.is_enrolled);
  const scores = ((scoresResult.data ?? []) as CommunityScore[]).filter((s) =>
    enrolledIds.has(s.user_id),
  );
  const teams = (teamsResult.data ?? []) as Team[];
  const championPicks = ((predictionsResult.data ?? []) as ChampionPick[]).filter((p) =>
    enrolledIds.has(p.user_id),
  );
  const reactions = ((reactionsResult.data ?? []) as ReactionRow[]).filter(
    (r) => enrolledIds.has(r.reactor_id) && enrolledIds.has(r.target_user_id),
  );

  // Participantes = inscritos con pronóstico (fila en predictions) o al menos
  // un marcador. Se enlazan a su pronóstico completo.
  const participantIds = new Set<string>([
    ...championPicks.map((p) => p.user_id),
    ...scores.map((s) => s.user_id),
  ]);
  const participants = profiles
    .filter((p) => participantIds.has(p.id))
    .sort((a, b) => displayName(a).localeCompare(displayName(b)));

  return (
    <CommunityView
      groupMatches={groupMatches}
      scores={scores}
      profiles={profiles}
      participants={participants}
      teams={teams}
      championPicks={championPicks}
      reactions={reactions}
      currentUserId={user.id}
    />
  );
}
