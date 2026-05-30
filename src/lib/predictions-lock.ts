import { createClient } from '@/lib/supabase/server';

/**
 * Helpers de "lock global" del pronóstico.
 *
 * El lock es el momento en que arranca el partido #1 del torneo. Tras
 * esa hora nadie puede crear ni modificar pronósticos:
 *   - En BD: las policies RLS de las 3 tablas (predictions,
 *     prediction_group_scores, prediction_bracket) chequean
 *     `now() < predictions_lock_at()`.
 *   - En UI: deshabilitamos inputs y mostramos vista read-only.
 *
 * Leemos la hora del lock desde `matches.kicks_off_at` del match #1
 * (no la hardcodeamos) para que si la fecha del partido inaugural
 * cambiara en BD, el lock se sincronice automáticamente con la misma
 * fuente que usa la función SQL `predictions_lock_at()`.
 */

/**
 * Devuelve el timestamp del kickoff del match #1, o null si por algún
 * motivo no se pudo leer (ej. RLS bloqueando, BD sin seed).
 */
export async function getPredictionsLockAt(): Promise<Date | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('matches')
    .select('kicks_off_at')
    .eq('match_number', 1)
    .single();
  if (error || !data) {
    console.error('[predictions-lock] no se pudo leer match #1:', error?.message);
    return null;
  }
  return new Date(data.kicks_off_at);
}

/**
 * Variante síncrona cuando ya tienes el lock-at calculado (típicamente
 * el server component padre lo pasa por props). Evita un round-trip a
 * Supabase por componente hijo.
 */
export function isLockedAt(lockAt: Date | null, now: Date = new Date()): boolean {
  if (!lockAt) return false;
  return now.getTime() >= lockAt.getTime();
}

/**
 * Resuelve el lock-at y compara con `now` en una sola llamada. Útil en
 * server actions y páginas que no reciben el lock por props.
 */
export async function isPredictionsLocked(now: Date = new Date()): Promise<boolean> {
  const lockAt = await getPredictionsLockAt();
  return isLockedAt(lockAt, now);
}
