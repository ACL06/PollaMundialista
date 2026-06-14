'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { SCORING } from '@/lib/scoring';
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock';
import { cn } from '@/lib/utils';
import type { RankingRow } from './types';

interface ScoreBreakdownModalProps {
  row: RankingRow;
  isCurrent: boolean;
  onClose: () => void;
}

interface Line {
  label: string;
  detail?: string;
  points: number;
}

interface Section {
  title: string;
  lines: Line[];
}

/** "N × valor" — el conteo se deriva dividiendo los puntos por el valor
 *  unitario (los puntos siempre son múltiplo exacto del valor). */
function mult(points: number, unit: number): string {
  return `${unit ? points / unit : 0} × ${unit}`;
}

/** Arma las secciones del desglose desde el breakdown ya calculado. */
function buildSections(b: RankingRow['breakdown']): Section[] {
  return [
    {
      title: 'Fase de grupos',
      lines: [
        {
          label: 'Marcadores exactos',
          detail: `${b.groupExactCount} × ${SCORING.groupExact}`,
          points: b.groupExact,
        },
        {
          label: 'Solo resultado',
          detail: `${b.groupOutcomeCount} × ${SCORING.groupOutcome}`,
          points: b.groupOutcome,
        },
      ],
    },
    {
      title: 'Eliminatorias (marcadores)',
      lines: [
        {
          label: 'Marcadores exactos',
          detail: `${b.knockoutExactCount} × ${SCORING.knockoutExact}`,
          points: b.knockoutExact,
        },
        {
          label: 'Solo resultado',
          detail: `${b.knockoutOutcomeCount} × ${SCORING.knockoutOutcome}`,
          points: b.knockoutOutcome,
        },
      ],
    },
    {
      title: 'Clasificados',
      lines: [
        { label: 'Eliminatorias de 32', detail: mult(b.r32, SCORING.bracket.r32), points: b.r32 },
        { label: 'Octavos de Final', detail: mult(b.r16, SCORING.bracket.r16), points: b.r16 },
        { label: 'Cuartos de Final', detail: mult(b.qf, SCORING.bracket.qf), points: b.qf },
        { label: 'Semifinales', detail: mult(b.sf, SCORING.bracket.sf), points: b.sf },
      ],
    },
    {
      title: 'Definiciones',
      lines: [
        { label: 'Finalistas', detail: mult(b.finalists, SCORING.finalist), points: b.finalists },
        { label: 'Tercer lugar', detail: mult(b.thirdPlace, SCORING.thirdPlace), points: b.thirdPlace },
        { label: 'Campeón', detail: mult(b.champion, SCORING.champion), points: b.champion },
        {
          label: 'Marcador de la final (bonus)',
          detail: mult(b.finalExact, SCORING.finalExact),
          points: b.finalExact,
        },
        { label: 'Goleador', detail: mult(b.topScorer, SCORING.topScorer), points: b.topScorer },
      ],
    },
  ];
}

/**
 * Modal con el desglose de cómo sumó sus puntos un participante: por sección
 * (grupos, eliminatorias, clasificados, definiciones) con el detalle y el
 * total. Presentación pura — los números vienen del `ScoreBreakdown`.
 */
export function ScoreBreakdownModal({ row, isCurrent, onClose }: ScoreBreakdownModalProps) {
  // El modal solo se monta abierto → bloquear el scroll del fondo siempre.
  useBodyScrollLock(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sections = buildSections(row.breakdown);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="breakdown-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Encabezado: avatar + nombre + total */}
        <div className="flex items-center gap-3 pr-8">
          {row.avatarUrl ? (
            <Image
              src={row.avatarUrl}
              alt=""
              width={44}
              height={44}
              unoptimized
              className="rounded-full bg-muted flex-shrink-0"
            />
          ) : (
            <span className="h-11 w-11 rounded-full bg-muted inline-block flex-shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <h2 id="breakdown-title" className="text-base font-bold text-foreground truncate">
              {row.name}
              {isCurrent && <span className="ml-1.5 text-[12px] text-primary font-medium">(tú)</span>}
            </h2>
            <p className="text-xs text-muted-foreground">
              Posición #{row.rank} · {row.breakdown.total} pts
            </p>
          </div>
        </div>

        {/* Secciones */}
        <div className="mt-5 flex flex-col gap-4">
          {sections.map((section) => {
            const subtotal = section.lines.reduce((a, l) => a + l.points, 0);
            return (
              <div key={section.title}>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h3>
                  <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                    {subtotal} pts
                  </span>
                </div>
                <ul className="rounded-lg border border-border divide-y divide-border/60">
                  {section.lines.map((line) => (
                    <li
                      key={line.label}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2 text-sm',
                        line.points === 0 && 'text-muted-foreground',
                      )}
                    >
                      <span className="min-w-0">
                        <span className={line.points > 0 ? 'text-foreground' : ''}>{line.label}</span>
                        {line.detail && (
                          <span className="ml-1.5 text-[11px] text-muted-foreground tabular-nums">
                            ({line.detail})
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          'tabular-nums font-semibold flex-shrink-0',
                          line.points > 0 ? 'text-foreground' : 'text-muted-foreground/60',
                        )}
                      >
                        {line.points}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="mt-5 flex items-center justify-between rounded-lg bg-primary/[0.06] border border-primary/30 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-lg font-bold text-foreground tabular-nums">
            {row.breakdown.total} pts
          </span>
        </div>
      </div>
    </div>
  );
}
