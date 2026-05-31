'use server';

import { createClient } from '@/lib/supabase/server';

interface ActionResult {
  error?: string;
}

const VALID_STATUS = new Set(['scheduled', 'live', 'final']);

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

  const { error } = await admin.supabase
    .from('matches')
    .update({ home_score: homeScore, away_score: awayScore, status })
    .eq('id', matchId);

  if (error) {
    console.error('[saveMatchResult]', error.message);
    return { error: 'No pudimos guardar el resultado. Intenta de nuevo.' };
  }
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
  status: string;
}): Promise<ActionResult> {
  const { matchId, homeTeamCode, awayTeamCode, homeScore, awayScore, status } = input;

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
  const inRange = (n: number | null) => n === null || (Number.isInteger(n) && n >= 0 && n <= 99);
  if (!inRange(homeScore) || !inRange(awayScore)) {
    return { error: 'Marcador fuera de rango (0–99)' };
  }

  const admin = await requireAdmin();
  if ('error' in admin) return { error: admin.error };

  const { error } = await admin.supabase
    .from('matches')
    .update({
      home_team_code: homeTeamCode,
      away_team_code: awayTeamCode,
      home_score: homeScore,
      away_score: awayScore,
      status,
    })
    .eq('id', matchId);

  if (error) {
    console.error('[saveKnockoutMatch]', error.message);
    return { error: 'No pudimos guardar el partido. Intenta de nuevo.' };
  }
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

  const { error } = await admin.supabase
    .from('profiles')
    .update({ is_enrolled: input.enrolled })
    .eq('id', input.userId);

  if (error) {
    console.error('[setEnrollment]', error.message);
    return { error: 'No pudimos actualizar la inscripción. Intenta de nuevo.' };
  }
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

  const { error } = await admin.supabase
    .from('tournament_settings')
    .update({ top_scorer: trimmed, updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) {
    console.error('[saveTopScorer]', error.message);
    return { error: 'No pudimos guardar el goleador. Intenta de nuevo.' };
  }
  return {};
}
