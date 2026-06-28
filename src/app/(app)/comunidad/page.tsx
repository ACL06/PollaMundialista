import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/supabase/fetch-all';
import { getPredictionsLockAt, isLockedAt } from '@/lib/predictions-lock';
import { getDailyFactsUpTo } from '@/lib/daily-facts';
import { getViewerAccess } from '@/lib/access';
import { SpectatorBlocked } from '@/components/app/SpectatorBlocked';
import { Countdown } from '@/components/pronosticos/Countdown';
import { CommunityView } from './CommunityView';
import {
  displayName,
  type PredictionPick,
  type CommunityScore,
  type PublicProfile,
  type ReactionRow,
} from './shared';
import type { Match, Team } from '@/lib/types/match';
import type { PredictionBracketEntry } from '@/lib/types/prediction';

export const metadata = { title: 'Comunidad' };

export default async function ComunidadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Modo espectador (post-lock, no inscrito): Comunidad queda bloqueada.
  const { isSpectator, isAdmin } = await getViewerAccess();
  if (isSpectator) return <SpectatorBlocked />;

  const lockAt = await getPredictionsLockAt();
  const locked = isLockedAt(lockAt);

  // Gate: antes del lock, los pronósticos de otros NO se muestran (para que
  // nadie copie). Solo se abren cuando arranca el Mundial. Excepción: el ADMIN
  // (organizador, no compite) puede previsualizar/monitorear antes del lock; la
  // lectura de los demás la habilita la RLS con `or is_admin()`.
  if (!locked && !isAdmin) {
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
    knockoutScoresResult,
    bracketResult,
    predictionsResult,
    profilesResult,
    teamsResult,
    reactionsResult,
  ] = await Promise.all([
      // Todos los partidos (grupos + eliminatorias). La vista decide qué
      // mostrar por día; los cruces de eliminatoria solo aparecen cuando
      // arrancan (sus pronósticos ya son públicos por RLS).
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
        .order('kicks_off_at', { ascending: true }),
      // Lectura global (~40 usuarios × 72 marcadores ≈ 2.900 filas): supera el
      // "Max Rows" de PostgREST → fetchAll pagina; el .order() la hace estable.
      fetchAll(() =>
        supabase
          .from('prediction_group_scores')
          .select('user_id, match_id, home_score, away_score')
          .order('user_id')
          .order('match_id'),
      ),
      // Marcadores de eliminatoria. La RLS solo devuelve los de cruces ya
      // arrancados (+ los propios) → la visibilidad correcta viene sola.
      fetchAll(() =>
        supabase
          .from('prediction_knockout_scores')
          .select('user_id, match_id, home_score, away_score')
          .order('user_id')
          .order('match_id'),
      ),
      // Bracket de clasificados (para la sección "Clasificados" + estadísticas).
      fetchAll(() =>
        supabase
          .from('prediction_bracket')
          .select('user_id, round, team_code')
          .order('user_id')
          .order('round')
          .order('team_code'),
      ),
      supabase.from('predictions').select('user_id, champion_code, runner_up_code, top_scorer'),
      supabase
        .from('public_profiles')
        .select('id, nickname, first_name, last_name, avatar_url, favorite_team, is_enrolled'),
      supabase
        .from('teams')
        .select('code, name, flag, group_code')
        .not('group_code', 'is', null),
      // Reacciones: única tabla sin techo natural (puede crecer todo el torneo).
      fetchAll(() =>
        supabase
          .from('prediction_reactions')
          .select('reactor_id, target_user_id, match_id, reaction')
          .order('reactor_id')
          .order('target_user_id')
          .order('match_id'),
      ),
    ]);

  const matches = (matchesResult.data ?? []).map((row) => {
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
  // Grupos + eliminatoria comparten la misma forma {user_id, match_id, home, away}
  // y conviven en el mismo Map por match_id (la vista distingue por el stage del
  // partido). Se combinan en un solo arreglo de scores.
  const groupScores = (scoresResult.data ?? []) as CommunityScore[];
  const knockoutScores = (knockoutScoresResult.data ?? []) as CommunityScore[];
  const scores = [...groupScores, ...knockoutScores].filter((s) => enrolledIds.has(s.user_id));
  const bracket = ((bracketResult.data ?? []) as PredictionBracketEntry[]).filter((b) =>
    enrolledIds.has(b.user_id),
  );
  const teams = (teamsResult.data ?? []) as Team[];
  const picks = ((predictionsResult.data ?? []) as PredictionPick[]).filter((p) =>
    enrolledIds.has(p.user_id),
  );
  const reactions = ((reactionsResult.data ?? []) as ReactionRow[]).filter(
    (r) => enrolledIds.has(r.reactor_id) && enrolledIds.has(r.target_user_id),
  );

  // Participantes = TODOS los inscritos (aunque aún no hayan pronosticado).
  // Se enlazan a su pronóstico completo (queda vacío si no registraron nada).
  const participants = [...profiles].sort((a, b) =>
    displayName(a).localeCompare(displayName(b)),
  );

  // Dato curioso del día: anclado al lock (= arranque del Mundial), así el
  // "Día 1 de 40" cae el día inaugural. Server-side y en TZ Bogotá. Se mandan
  // los datos del día 1 al ACTUAL (los futuros no viajan al cliente) para que
  // la cápsula permita repasar días anteriores. Para el admin previsualizando
  // antes del lock, `now < lock` → vacío (no se muestra).
  const dailyFacts = getDailyFactsUpTo(new Date(), lockAt);

  return (
    <CommunityView
      matches={matches}
      scores={scores}
      bracket={bracket}
      profiles={profiles}
      participants={participants}
      teams={teams}
      picks={picks}
      reactions={reactions}
      currentUserId={user.id}
      isAdmin={isAdmin}
      nowIso={new Date().toISOString()}
      dailyFacts={dailyFacts}
    />
  );
}
