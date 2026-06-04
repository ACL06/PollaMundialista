'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Nombre corto para el podio: "Juan Sebastián Rodríguez" → "Juan R.". */
function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return full;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

interface PodiumNamesProps {
  /** Nombres completos de los usuarios en este puesto (Nombre Apellidos). */
  names: string[];
  /** Datos de ejemplo → estilo atenuado. */
  muted?: boolean;
}

/**
 * Nombre(s) de un puesto del podio. Si hay un empate (varios usuarios en el
 * mismo puesto), se pasan de a uno con flechas a los lados — así da igual
 * cuántos empaten, la columna no crece. Se muestra el nombre corto; el completo
 * va en `title` (hover) y en `/ranking`.
 */
export function PodiumNames({ names, muted = false }: PodiumNamesProps) {
  const [index, setIndex] = useState(0);

  if (names.length === 0) {
    return <span className="text-[12px] text-muted-foreground/40">—</span>;
  }

  const nameClass = cn(
    'min-w-0 flex-1 truncate text-center text-[12px] font-medium leading-tight',
    muted ? 'text-muted-foreground/60 italic' : 'text-foreground',
  );

  // Un solo usuario: sin flechas.
  if (names.length === 1) {
    return (
      <span title={names[0]} className={nameClass}>
        {shortName(names[0])}
      </span>
    );
  }

  // Empate: carrusel con flechas + contador "i/N".
  const i = ((index % names.length) + names.length) % names.length;
  const arrowClass =
    'inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary';

  return (
    <div className="flex w-full flex-col items-center gap-0.5">
      <div className="flex w-full items-center gap-0.5">
        <button type="button" onClick={() => setIndex(i - 1)} aria-label="Anterior" className={arrowClass}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span title={names[i]} className={nameClass}>
          {shortName(names[i])}
        </span>
        <button type="button" onClick={() => setIndex(i + 1)} aria-label="Siguiente" className={arrowClass}>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground">
        {i + 1}/{names.length}
      </span>
    </div>
  );
}
