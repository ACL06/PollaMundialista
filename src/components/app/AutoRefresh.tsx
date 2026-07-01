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
  /**
   * Franja horaria (hora Bogotá, 0-23) en la que se permite refrescar EN REPOSO.
   * Fuera de ella el timer sigue vivo pero NO refresca (0 costo de servidor),
   * así se reactiva solo al volver a entrar en la franja. El modo `active`
   * (partido en curso) refresca a cualquier hora. Si se omiten, refresca siempre.
   */
  activeStartHour?: number;
  activeEndHour?: number;
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
 * ocultar la pestaña y, al volver a ella, refresca de inmediato (catch-up) para
 * que el usuario vea lo último sin esperar el próximo tick ni recargar.
 *
 * Además, en reposo puede limitarse a una franja horaria (`activeStartHour` /
 * `activeEndHour`, hora Bogotá): de madrugada —cuando no hay partidos— el timer
 * sigue vivo pero no dispara el refresh, ahorrando Active CPU.
 */
export function AutoRefresh({
  intervalMs = 60_000,
  idleIntervalMs,
  active = true,
  activeStartHour,
  activeEndHour,
}: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const effective = active ? intervalMs : (idleIntervalMs ?? intervalMs);
    if (!effective || effective <= 0) return; // sin polling en reposo
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      // En reposo, respetar la franja horaria (hora Bogotá; Colombia es UTC-5
      // fijo, sin horario de verano). Fuera de ella no refrescamos —el timer
      // sigue vivo, solo evalúa— para no gastar Active CPU de madrugada, cuando
      // no hay partidos. El modo activo (partido en curso) refresca siempre.
      if (!active && activeStartHour != null && activeEndHour != null) {
        const bogotaHour = (new Date().getUTCHours() - 5 + 24) % 24;
        if (bogotaHour < activeStartHour || bogotaHour >= activeEndHour) return;
      }
      router.refresh();
    }, effective);
    return () => window.clearInterval(id);
  }, [router, intervalMs, idleIntervalMs, active, activeStartHour, activeEndHour]);

  // Catch-up al volver a la pestaña: si estaba oculta y vuelve a ser visible,
  // refresca de inmediato (un refresco puntual, no un bucle) para que el usuario
  // vea lo último sin esperar el próximo tick del intervalo.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [router]);

  return null;
}
