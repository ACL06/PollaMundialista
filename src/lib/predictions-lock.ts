import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
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
 * cambiara en BD, el lock se sincronice con la misma fuente que usa la
 * función SQL `predictions_lock_at()`.
 *
 * Importante: solo cacheamos el TIMESTAMP del kickoff (un dato casi
 * inmutable). El "está cerrado" (`isLockedAt`) se sigue calculando contra
 * `new Date()` fresco en cada llamada, así el lock se activa en el instante
 * exacto aunque el timestamp venga de caché.
 */

/** Tag para invalidar el caché del kickoff si algún día se reprograma el match #1. */
export const MATCH1_KICKOFF_TAG = 'match-1-kickoff';

/**
 * Lectura cacheable (entre requests) del kickoff del match #1. Usa un cliente
 * SIN cookies (anon) porque `unstable_cache` no admite datos dinámicos como
 * cookies, y `matches` es de lectura pública. `revalidate` largo: el dato casi
 * nunca cambia. Devuelve el ISO o null si no se pudo leer (p.ej. anon sin
 * permiso / BD sin seed) — en ese caso `getPredictionsLockAt` hace fallback.
 */
const getCachedKickoffIso = unstable_cache(
  async (): Promise<string | null> => {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await supabase
      .from('matches')
      .select('kicks_off_at')
      .eq('match_number', 1)
      .maybeSingle();
    return data?.kicks_off_at ?? null;
  },
  ['match-1-kickoff'],
  { revalidate: 3600, tags: [MATCH1_KICKOFF_TAG] },
);

/**
 * Devuelve el timestamp del kickoff del match #1, o null si no se pudo leer.
 * Envuelto en `cache()` de React → dentro de un mismo request, todos los
 * componentes que lo llamen comparten una sola resolución (sin re-consultar).
 */
export const getPredictionsLockAt = cache(async (): Promise<Date | null> => {
  // Camino rápido: kickoff cacheado entre requests (cliente anon, sin cookies).
  const cachedIso = await getCachedKickoffIso();
  if (cachedIso) return new Date(cachedIso);

  // Fallback robusto: si el anon no pudo leer (RLS) o aún no hay seed, leer con
  // el cliente autenticado. No cacheado, pero garantiza que el lock no se rompa.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('matches')
    .select('kicks_off_at')
    .eq('match_number', 1)
    .maybeSingle();
  if (error || !data) {
    console.error('[predictions-lock] no se pudo leer match #1:', error?.message);
    return null;
  }
  return new Date(data.kicks_off_at);
});

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
