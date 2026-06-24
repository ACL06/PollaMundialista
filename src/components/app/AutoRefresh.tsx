'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AutoRefreshProps {
  /** Intervalo entre refrescos cuando hay actividad, en ms. Por defecto 60s. */
  intervalMs?: number;
  /**
   * Intervalo de respaldo cuando NO hay actividad (ms). Si se omite, usa
   * `intervalMs` (mismo comportamiento de siempre). Si es 0, no refresca en
   * reposo. Cada refresco re-evalúa `active` en el servidor, así que al entrar
   * en una ventana de partido el polling se acelera solo.
   */
  idleIntervalMs?: number;
  /** Hay actividad (partido en vivo o cercano) → usa el intervalo corto. */
  active?: boolean;
}

/**
 * Refresca los Server Components de la ruta (router.refresh, sin recarga
 * visible ni perder scroll/estado), SOLO mientras la pestaña está visible.
 * Sirve para que los cambios que hace el admin (estado del partido, marcadores,
 * aciertos) se reflejen sin que el usuario recargue — `revalidatePath` invalida
 * el caché del servidor pero no "empuja" a los clientes ya abiertos. No
 * renderiza nada.
 *
 * Para no gastar Active CPU de balde, el ritmo es **consciente de actividad**:
 * `intervalMs` (corto) cerca de los partidos y `idleIntervalMs` (largo) el
 * resto del tiempo, que es cuando nada cambia. Polling deliberado en vez de
 * Supabase Realtime: más simple y suficiente para una polla; se pausa al
 * ocultar la pestaña.
 */
export function AutoRefresh({
  intervalMs = 60_000,
  idleIntervalMs,
  active = true,
}: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const effective = active ? intervalMs : (idleIntervalMs ?? intervalMs);
    if (!effective || effective <= 0) return; // sin polling en reposo
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, effective);
    return () => window.clearInterval(id);
  }, [router, intervalMs, idleIntervalMs, active]);

  return null;
}
