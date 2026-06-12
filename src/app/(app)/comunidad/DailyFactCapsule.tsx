'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailyFactToday } from '@/lib/daily-facts';

interface DailyFactCapsuleProps {
  /** Datos del día 1 al ACTUAL (orden cronológico). El server no manda futuros. */
  facts: DailyFactToday[];
}

const arrowClass = cn(
  'inline-flex h-7 w-7 items-center justify-center rounded-full border border-tertiary/30 text-tertiary',
  'transition-colors hover:bg-tertiary/10',
  'disabled:pointer-events-none disabled:opacity-30',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
);

/**
 * "Dato curioso del día ⚽" — cápsula de Comunidad con flechas para repasar
 * los datos de días ANTERIORES (nunca futuros: el array llega solo hasta hoy,
 * y la flecha → se apaga en el actual). El índice es estado local SIN
 * persistencia: al entrar/recargar siempre arranca en el dato del día.
 */
export function DailyFactCapsule({ facts }: DailyFactCapsuleProps) {
  const [index, setIndex] = useState(facts.length - 1); // siempre el actual al montar
  const view = facts[index];
  if (!view) return null;

  const isToday = index === facts.length - 1;

  return (
    <section
      aria-label="Dato curioso del día"
      className="rounded-xl border border-tertiary/30 bg-tertiary/5 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-tertiary">
          <span aria-hidden>💡</span> Dato curioso del día
        </span>
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums whitespace-nowrap">
          Día {view.day} de {view.total}
        </span>
      </div>

      <h3 className="mt-2.5 text-base sm:text-lg font-bold leading-snug text-foreground">
        {view.title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-foreground/90">{view.text}</p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-tertiary/10 px-2 py-0.5 text-[11px] font-medium text-tertiary">
          {view.categoryLabel}
        </span>
        {/* Navegación: solo hacia atrás y de vuelta hasta el del día (→ se
            apaga en el actual; no existen datos futuros en el array). */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Ver el dato curioso anterior"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className={arrowClass}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Ver el dato curioso siguiente"
            disabled={isToday}
            onClick={() => setIndex((i) => Math.min(facts.length - 1, i + 1))}
            className={arrowClass}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
