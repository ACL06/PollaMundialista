'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AutoRefreshProps {
  /** Intervalo entre refrescos, en ms. Por defecto 60s. */
  intervalMs?: number;
}

/**
 * Refresca los Server Components de la ruta cada `intervalMs` (router.refresh,
 * sin recarga visible ni perder scroll/estado), SOLO mientras la pestaña está
 * visible. Sirve para que los cambios que hace el admin (estado del partido,
 * marcadores, aciertos) se reflejen sin que el usuario recargue —
 * `revalidatePath` invalida el caché del servidor pero no "empuja" a los
 * clientes ya abiertos. No renderiza nada.
 *
 * Polling deliberado en vez de Supabase Realtime: más simple y suficiente para
 * una polla; se pausa al ocultar la pestaña para no gastar de más.
 */
export function AutoRefresh({ intervalMs = 60_000 }: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
