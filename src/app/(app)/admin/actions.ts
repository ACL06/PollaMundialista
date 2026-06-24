'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { MATCH_STATUSES } from '@/lib/types/match';

interface ActionResult {
  error?: string;
}

// Derivado de MATCH_STATUSES (única fuente de verdad) — incluye 'suspended'.
const VALID_STATUS = new Set<string>(MATCH_STATUSES);

// Vistas que dependen de los resultados/estado oficiales del torneo. Tras una
// mutación del admin las marcamos obsoletas para que reflejen el cambio en la
// próxima navegación de cualquier usuario (sin depender de que expire el caché
// del router). Es barato: solo invalida; no re-renderiza nada al instante.
const RESULT_VIEWS = ['/home', '/calendar', '/grupos', '/ranking', '/comunidad', '/pronosticos'];
function revalidateResultViews() {
  for (const path of RESULT_VIEWS) revalidatePath(path);
}

/** Verifica que el usuario actual sea admin. Devuelve el client + userId o un error. */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' as const };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { error: 'No autorizado' as const };

  return { supabase, userId: user.id };
}

/**
 * Registra el resultado oficial de un partido: marcador + status.
 * Solo admins (re-chequeado aquí + RLS en BD). El marcador es opcional
 * (puede limpiarse pasando null) pero si se marca 'final' debería tener
 * ambos; eso lo valida la UI.
 */
export async function saveMatchResult(input: {
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}): Promise<ActionResult> {
  const { matchId, homeScore, awayScore, status } = input;

  if (!VALID_STATUS.has(status)) {
    return { error: 'Estado inválido' };
  }
  const inRange = (n: number | null) => n === null || (Number.isInteger(n) && n >= 0 && n <= 99);
  if (!inRange(homeScore) || !inRange(awayScore)) {
    return { error: 'Marcador fuera de rango (0–99)' };
  }

  const admin = await requireAdmin();
  if ('error' in admin) return { error: admin.error };

  // `count: 'exact'` para detectar el fallo SILENCIOSO de RLS: un UPDATE
  // bloqueado afecta 0 filas sin devolver error (lección del 11/jun/2026 con
  // setEnrollment). 0 filas → error visible en vez de un falso "Guardado".
  const { error, count } = await admin.supabase
    .from('matches')
    .update({ home_score: homeScore, away_score: awayScore, status }, { count: 'exact' })
    .eq('id', matchId);

  if (error) {
    console.error('[saveMatchResult]', error.message);
    return { error: 'No pudimos guardar el resultado. Intenta de nuevo.' };
  }
  if ((count ?? 0) === 0) {
    console.error('[saveMatchResult] 0 filas afectadas (¿RLS?)', matchId);
    return { error: 'No se guardó: la base de datos no aplicó el cambio (permisos/RLS).' };
  }
  revalidateResultViews();
  return {};
}

/**
 * Registra un partido eliminatorio: equipos (home/away, asignables a
 * medida que se resuelven las rondas) + marcador + status. Solo admins.
 */
export async function saveKnockoutMatch(input: {
  matchId: string;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  homeScore: number | null;
  awayScore: number | null;
  /** Ganador declarado (final/3er por penales). Null = inferir del marcador. */
  winnerCode?: string | null;
  status: string;
}): Promise<ActionResult> {
  const { matchId, homeTeamCode, awayTeamCode, homeScore, awayScore, status } = input;
  const winnerCode = input.winnerCode ?? null;

  if (!VALID_STATUS.has(status)) {
    return { error: 'Estado inválido' };
  }
  const codeOk = (c: string | null) => c === null || /^[A-Z]{2,4}$/.test(c);
  if (!codeOk(homeTeamCode) || !codeOk(awayTeamCode)) {
    return { error: 'Código de equipo inválido' };
  }
  if (homeTeamCode && awayTeamCode && homeTeamCode === awayTeamCode) {
    return { error: 'Un equipo no puede jugar contra sí mismo' };
  }
  // El ganador declarado debe ser uno de los dos equipos del partido.
  if (winnerCode !== null && winnerCode !== homeTeamCode && winnerCode !== awayTeamCode) {
    return { error: 'El ganador debe ser uno de los dos equipos' };
  }
  const inRange = (n: number | null) => n === null || (Number.isInteger(n) && n >= 0 && n <= 99);
  if (!inRange(homeScore) || !inRange(awayScore)) {
    return { error: 'Marcador fuera de rango (0–99)' };
  }

  const admin = await requireAdmin();
  if ('error' in admin) return { error: admin.error };

  const { error, count } = await admin.supabase
    .from('matches')
    .update(
      {
        home_team_code: homeTeamCode,
        away_team_code: awayTeamCode,
        home_score: homeScore,
        away_score: awayScore,
        winner_code: winnerCode,
        status,
      },
      { count: 'exact' },
    )
    .eq('id', matchId);

  if (error) {
    console.error('[saveKnockoutMatch]', error.message);
    return { error: 'No pudimos guardar el partido. Intenta de nuevo.' };
  }
  if ((count ?? 0) === 0) {
    console.error('[saveKnockoutMatch] 0 filas afectadas (¿RLS?)', matchId);
    return { error: 'No se guardó: la base de datos no aplicó el cambio (permisos/RLS).' };
  }
  revalidateResultViews();
  return {};
}

/**
 * Cambia el estado de inscripción de un usuario (pre-inscrito ↔ inscrito).
 * Lo administra el admin a mano porque el pago es por un medio externo
 * (la app no tiene pasarela). Solo admins (re-chequeado aquí + RLS).
 */
export async function setEnrollment(input: {
  userId: string;
  enrolled: boolean;
}): Promise<ActionResult> {
  if (!input.userId || typeof input.enrolled !== 'boolean') {
    return { error: 'Datos inválidos' };
  }

  const admin = await requireAdmin();
  if ('error' in admin) return { error: admin.error };

  const { error, count } = await admin.supabase
    .from('profiles')
    .update({ is_enrolled: input.enrolled }, { count: 'exact' })
    .eq('id', input.userId);

  if (error) {
    console.error('[setEnrollment]', error.message);
    return { error: 'No pudimos actualizar la inscripción. Intenta de nuevo.' };
  }
  if ((count ?? 0) === 0) {
    // RLS sin política de UPDATE-admin en profiles bloquea en silencio (0 filas).
    console.error('[setEnrollment] 0 filas afectadas (¿falta política RLS admin?)', input.userId);
    return { error: 'No se guardó: la base de datos no aplicó el cambio (permisos/RLS).' };
  }
  revalidateResultViews();
  return {};
}

/** Guarda el goleador oficial del torneo (texto libre, o null para limpiar). */
export async function saveTopScorer(name: string | null): Promise<ActionResult> {
  const trimmed = name?.trim() || null;
  if (trimmed && trimmed.length > 80) {
    return { error: 'Máximo 80 caracteres' };
  }

  const admin = await requireAdmin();
  if ('error' in admin) return { error: admin.error };

  const { error, count } = await admin.supabase
    .from('tournament_settings')
    .update({ top_scorer: trimmed, updated_at: new Date().toISOString() }, { count: 'exact' })
    .eq('id', 1);

  if (error) {
    console.error('[saveTopScorer]', error.message);
    return { error: 'No pudimos guardar el goleador. Intenta de nuevo.' };
  }
  if ((count ?? 0) === 0) {
    console.error('[saveTopScorer] 0 filas afectadas (¿RLS?)');
    return { error: 'No se guardó: la base de datos no aplicó el cambio (permisos/RLS).' };
  }
  revalidateResultViews();
  return {};
}

/**
 * Guarda el orden manual de un grupo (override del admin) + los terceros que
 * clasifican. Solo afecta el DISPLAY de `/grupos`; no toca el scoring. Recibe
 * las 4 posiciones de un grupo y hace upsert en `group_standings`.
 */
export async function saveGroupStandings(input: {
  entries: { teamCode: string; position: number; thirdQualifies: boolean }[];
}): Promise<ActionResult> {
  const { entries } = input;
  if (!Array.isArray(entries) || entries.length === 0) {
    return { error: 'Datos inválidos' };
  }
  for (const e of entries) {
    if (!/^[A-Z]{2,4}$/.test(e.teamCode)) return { error: 'Código de equipo inválido' };
    if (!Number.isInteger(e.position) || e.position < 1 || e.position > 4) {
      return { error: 'Posición fuera de rango (1–4)' };
    }
  }

  const admin = await requireAdmin();
  if ('error' in admin) return { error: admin.error };

  const { error, count } = await admin.supabase.from('group_standings').upsert(
    entries.map((e) => ({
      team_code: e.teamCode,
      position: e.position,
      third_qualifies: e.thirdQualifies,
      updated_at: new Date().toISOString(),
    })),
    { count: 'exact' },
  );

  if (error) {
    console.error('[saveGroupStandings]', error.message);
    return { error: 'No pudimos guardar el orden. Intenta de nuevo.' };
  }
  if ((count ?? 0) === 0) {
    console.error('[saveGroupStandings] 0 filas afectadas (¿RLS?)');
    return { error: 'No se guardó: la base de datos no aplicó el cambio (permisos/RLS).' };
  }
  revalidateResultViews();
  return {};
}
