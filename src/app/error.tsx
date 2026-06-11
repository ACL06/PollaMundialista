'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Error boundary global (App Router): reemplaza el "Application error" pelado
 * de Next por una pantalla de la app con reintento. `reset()` re-renderiza el
 * segmento que falló — si el error fue transitorio (p. ej. un blip de red
 * hacia Supabase, cuya promesa de fetch rechaza y no pasa por el canal
 * `{ error }`), el reintento lo resuelve.
 *
 * Cubre todas las rutas; el root layout queda montado, así que los tokens del
 * tema siguen aplicando. El `digest` se muestra pequeño para poder reportarlo.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Queda en los logs del navegador; el server ya lo registró con el digest.
    console.error('[app-error]', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-16">
      <div className="max-w-md w-full text-center flex flex-col items-center gap-4">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold text-foreground">Algo salió mal</h1>
        <p className="text-sm text-muted-foreground">
          Tuvimos un error inesperado al cargar esta página. Suele ser pasajero: reintenta y
          debería funcionar. Si sigue fallando, avísanos en el grupo.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={reset}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg h-11 px-5 text-sm font-semibold',
              'bg-primary text-primary-foreground hover:brightness-110 transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
            )}
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
          {/* <a> a propósito (no <Link>): tras un error, una carga completa es lo más sano. */}
          <a
            href="/home"
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg h-11 px-5 text-sm font-medium',
              'border border-border text-foreground hover:bg-muted transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
            )}
          >
            Ir al inicio
          </a>
        </div>
        {error.digest && (
          <p className="text-[11px] text-muted-foreground/70 tabular-nums">
            Código del error: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
