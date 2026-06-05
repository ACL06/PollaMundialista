'use client';

import { Lock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockNoticeModalProps {
  open: boolean;
  title: string;
  message: string;
  /** Texto del botón de cierre. Por defecto "Entendido". */
  actionLabel?: string;
  /** Se llama al cerrar (X, botón o backdrop). El consumidor decide qué hacer
   *  (p. ej. refrescar a la vista read-only o solo cerrar el aviso). */
  onAcknowledge: () => void;
}

/**
 * Aviso "el plazo cerró". Se muestra cuando el lock (global del torneo o por
 * partido en eliminatorias) cae mientras el usuario estaba registrando datos.
 * No edita nada: solo informa. Calca el patrón de modal del proyecto
 * (ver EnrollmentReminderModal): sin animación, backdrop oscuro, accesible.
 */
export function LockNoticeModal({
  open,
  title,
  message,
  actionLabel = 'Entendido',
  onAcknowledge,
}: LockNoticeModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-notice-title"
      onClick={onAcknowledge}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onAcknowledge}
          aria-label="Cerrar"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Lock className="h-5 w-5" />
            </span>
            <h2 id="lock-notice-title" className="text-lg font-bold text-foreground">
              {title}
            </h2>
          </div>

          <p className="text-sm text-muted-foreground">{message}</p>

          <button
            type="button"
            onClick={onAcknowledge}
            className={cn(
              'mt-1 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold',
              'bg-primary text-primary-foreground hover:brightness-110 transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
            )}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
