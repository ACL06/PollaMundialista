import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { CalendarDays, CheckCircle2, ListOrdered, Settings, Target, Trophy, Users } from 'lucide-react';
import { WORLD_CUP_TEAMS } from '@/lib/validators/profile';
import { getPredictionsLockAt, isLockedAt } from '@/lib/predictions-lock';
import { KNOCKOUT_SCORE_STAGES } from '@/lib/knockout-window';
import { loadRanking } from '@/app/(app)/ranking/load-ranking';
import { PredictionStatusCard } from '@/components/home/PredictionStatusCard';
import { HomeStandingCard } from '@/components/home/HomeStandingCard';
import { OpenKnockoutNotice } from '@/components/home/OpenKnockoutNotice';
import { GameRules } from '@/components/home/GameRules';
import { EnrollmentPrizes, EnrollmentBadge } from '@/components/home/EnrollmentPrizes';

export const metadata = { title: 'Inicio' };

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const [
    profileResult,
    predictionResult,
    scoresCountResult,
    bracketCountResult,
    enrolledCountResult,
    registeredCountResult,
    knockoutMatchesResult,
    knockoutScoresResult,
    lockAt,
    ranking,
  ] = await Promise.all([
      supabase
        .from('profiles')
        .select('email, nickname, avatar_url, favorite_team, is_admin, is_enrolled')
        .eq('id', userId)
        .single(),
      supabase
        .from('predictions')
        .select(
          'locked_at, champion_code, runner_up_code, third_place_code, final_home_score, final_away_score, top_scorer',
        )
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('prediction_group_scores')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('prediction_bracket')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('public_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_enrolled', true),
      supabase
        .from('public_profiles')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('matches')
        .select('id, home_team_code, away_team_code, kicks_off_at')
        .in('stage', [...KNOCKOUT_SCORE_STAGES]),
      supabase.from('prediction_knockout_scores').select('match_id').eq('user_id', userId),
      getPredictionsLockAt(),
      loadRanking(),
    ]);

  const profile = profileResult.data;
  const prediction = predictionResult.data;
  const team = WORLD_CUP_TEAMS.find((t) => t.code === profile?.favorite_team);

  const isSubmitted = prediction?.locked_at != null;
  const isLocked = isLockedAt(lockAt);

  // "Tu posición" en el ranking: solo cuando ya hay resultados oficiales
  // (antes, todos estarían empatados en 0 → "#1" para todos, confuso) y
  // si el usuario participa.
  const myRow = ranking.hasResults ? ranking.rows.find((r) => r.userId === userId) : undefined;
  const scoresCount = scoresCountResult.count ?? 0;
  const bracketCount = bracketCountResult.count ?? 0;
  const enrolledCount = enrolledCountResult.count ?? 0;
  const registeredCount = registeredCountResult.count ?? 0;
  const preEnrolledCount = Math.max(0, registeredCount - enrolledCount);
  // ¿Registró ALGO (cierre, marcadores, bracket o knockout)? Para no decirle
  // "tu pronóstico quedó registrado" a quien nunca guardó nada.
  const hasAnyPrediction =
    prediction != null ||
    scoresCount > 0 ||
    bracketCount > 0 ||
    (knockoutScoresResult.data?.length ?? 0) > 0;
  const isEnrolled = profile?.is_enrolled ?? false;
  const isAdmin = profile?.is_admin ?? false;
  // Modo espectador: post-lock + no inscrito. En /home solo ve su encabezado,
  // las reglas y los accesos a calendario / fase de grupos.
  const isSpectator = isLocked && !isEnrolled && !isAdmin;

  // Aviso de cruces de eliminatoria ABIERTOS sin pronosticar: un cruce está
  // "abierto" cuando ya se conocen sus dos equipos y aún no arranca (misma
  // semántica que `knockoutMatchState`). Solo cuenta los que el usuario no ha
  // registrado. now = hora de servidor (no del dispositivo). Los espectadores
  // no participan → 0. La RLS por partido es el guard real del guardado.
  const predictedKnockoutIds = new Set(
    (knockoutScoresResult.data ?? []).map((r) => r.match_id as string),
  );
  const knockoutMatches = (knockoutMatchesResult.data ?? []) as {
    id: string;
    home_team_code: string | null;
    away_team_code: string | null;
    kicks_off_at: string;
  }[];
  const nowMs = Date.now();
  const openKnockoutCount = isSpectator
    ? 0
    : knockoutMatches.filter((m) => {
        const teamsKnown = m.home_team_code != null && m.away_team_code != null;
        const open = teamsKnown && nowMs < new Date(m.kicks_off_at).getTime();
        return open && !predictedKnockoutIds.has(m.id);
      }).length;

  // Podio real (puestos 1-3 del ranking, por Nombre y Apellidos) para
  // "Inscripción y premios". Incluye TODOS los de cada puesto → tolera empates
  // (varios en 1°, etc.). Solo con puntaje > 0; si no, el podio muestra ejemplo.
  // Sin montos: esos ya se explican en la sección de reparto.
  const podiumRows = ranking.hasResults
    ? ranking.rows.filter((r) => r.rank <= 3 && r.breakdown.total > 0)
    : [];
  const podiumWinners =
    podiumRows.length > 0 ? podiumRows.map((r) => ({ rank: r.rank, name: r.name })) : null;
  const metaCount =
    (prediction?.champion_code ? 1 : 0) +
    (prediction?.runner_up_code ? 1 : 0) +
    (prediction?.third_place_code ? 1 : 0) +
    (prediction?.final_home_score != null && prediction?.final_away_score != null ? 1 : 0) +
    (prediction?.top_scorer?.trim() ? 1 : 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col gap-8">
      {/* Saludo */}
      <div className="text-center space-y-5">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20 bg-muted relative">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={`Avatar de ${profile.nickname}`}
                width={96}
                height={96}
                className="h-full w-full"
                unoptimized
                priority
              />
            ) : (
              <div className="h-full w-full bg-primary/10" />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            ¡Bienvenido, {profile?.nickname}!
          </h1>
          <div className="flex justify-center">
            <EnrollmentBadge enrolled={profile?.is_enrolled ?? false} />
          </div>
          {team && (
            <p className="text-muted-foreground text-lg flex items-center justify-center gap-2">
              <span className={`fi fi-${team.flag} rounded-sm`} aria-hidden="true" />
              <span>Hincha de {team.name}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>Sesión iniciada como {profile?.email ?? user?.email}</span>
          </div>
        </div>
      </div>

      {/* Estado del pronóstico / posición — solo para participantes.
          Pre-lock: countdown + progreso. Post-lock: tu posición. El espectador
          (no inscrito) no ve esta tarjeta ni la de inscripción y premios. */}
      {!isSpectator &&
        (isLocked ? (
          // El admin organiza y NO compite: la tarjeta de posición no le aplica
          // (sin fila en el ranking quedaría en "espera" eterna).
          !isAdmin && (
            <HomeStandingCard
              rank={myRow?.rank ?? null}
              participants={ranking.rows.length}
              total={myRow?.breakdown.total ?? 0}
              exactCount={
                (myRow?.breakdown.groupExactCount ?? 0) + (myRow?.breakdown.knockoutExactCount ?? 0)
              }
              hasResults={ranking.hasResults}
              hasPrediction={hasAnyPrediction}
            />
          )
        ) : (
          <PredictionStatusCard
            lockAtIso={lockAt?.toISOString() ?? null}
            isLocked={isLocked}
            isSubmitted={isSubmitted}
            scoresCount={scoresCount}
            bracketCount={bracketCount}
            metaCount={metaCount}
            isEnrolled={isEnrolled}
          />
        ))}

      {/* Aviso: cruces de eliminatoria abiertos sin pronosticar. */}
      {openKnockoutCount > 0 && <OpenKnockoutNotice count={openKnockoutCount} />}

      {/* Reglas del juego */}
      <GameRules />

      {/* Inscripción y premios (oculto para el espectador). */}
      {!isSpectator && (
        <EnrollmentPrizes
          enrolledCount={enrolledCount}
          preEnrolledCount={preEnrolledCount}
          revealed={isLocked}
          podium={podiumWinners}
          podiumFinal={ranking.complete}
        />
      )}

      {/* Explora */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">Explora</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ExploreCard href="/calendar" Icon={CalendarDays} label="Calendario" />
          <ExploreCard href="/grupos" Icon={ListOrdered} label="Fase de grupos" />
          {!isSpectator && (
            <>
              <ExploreCard href="/pronosticos" Icon={Target} label="Pronósticos" />
              <ExploreCard href="/comunidad" Icon={Users} label="Comunidad" />
              <ExploreCard href="/ranking" Icon={Trophy} label="Ranking" />
            </>
          )}
        </div>

        {profile?.is_admin && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 self-start text-sm font-medium text-tertiary hover:underline"
          >
            <Settings className="h-4 w-4" />
            Panel admin
          </Link>
        )}
      </div>
    </div>
  );
}

function ExploreCard({
  href,
  Icon,
  label,
}: {
  href: string;
  Icon: typeof CalendarDays;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2.5 px-3 py-[18px] rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Icon className="h-[18px] w-[18px] text-tertiary" />
      <span className="text-[13px] font-medium text-center">{label}</span>
    </Link>
  );
}
