'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Crown, Eye, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RankingRow } from './types';
import { ScoreBreakdownModal } from './ScoreBreakdownModal';

interface RankingBoardProps {
  rows: RankingRow[];
  currentUserId: string;
  /** True si ya hay al menos un resultado oficial cargado. */
  hasResults: boolean;
}

/**
 * Parte interactiva del ranking: podio + tabla. Cada participante es
 * clicable y abre un modal con el desglose de cómo sumó sus puntos.
 */
export function RankingBoard({ rows, currentUserId, hasResults }: RankingBoardProps) {
  const [selected, setSelected] = useState<RankingRow | null>(null);

  // Posiciones del podio presentes (con puntos > 0). Con empates, una
  // posición puede tener varios jugadores y la siguiente se "salta"
  // (ranking de competición: dos en 1° → el siguiente es 3°).
  const podiumRanks = hasResults
    ? [1, 2, 3].filter((r) => rows.some((row) => row.rank === r && row.breakdown.total > 0))
    : [];

  return (
    <>
      {/* Podio (solo si ya hay puntos). Soporta empates por posición. */}
      {podiumRanks.length > 0 && (
        <section className="space-y-2">
          {podiumRanks.map((rank) => (
            <PodiumTier
              key={rank}
              rank={rank}
              players={rows.filter((r) => r.rank === rank && r.breakdown.total > 0)}
              currentUserId={currentUserId}
              onSelect={setSelected}
            />
          ))}
        </section>
      )}

      {/* Tabla completa */}
      <section className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground bg-muted/30">
              <th className="text-left font-medium pl-4 pr-2 py-2.5 w-10">#</th>
              <th className="text-left font-medium px-2 py-2.5">Participante</th>
              <th className="text-right font-medium px-2 py-2.5 w-14">Pts</th>
              {/* Ojito: señala que cada fila se puede abrir para ver el desglose. */}
              <th className="py-2.5 pr-4 w-9" aria-label="Ver desglose" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isCurrent = r.userId === currentUserId;
              return (
                <tr
                  key={r.userId}
                  onClick={() => setSelected(r)}
                  className={cn(
                    'border-b border-border/50 last:border-b-0 cursor-pointer transition-colors hover:bg-muted/40',
                    isCurrent && 'bg-primary/[0.06]',
                  )}
                >
                  <td className="pl-4 pr-2 py-2.5 text-muted-foreground tabular-nums">{r.rank}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar avatarUrl={r.avatarUrl} size={26} />
                      <span
                        className={cn(
                          'truncate',
                          isCurrent ? 'font-semibold text-foreground' : 'text-foreground',
                        )}
                      >
                        {r.name}
                        {isCurrent && (
                          <span className="ml-1.5 text-[11px] text-primary font-medium">(tú)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="text-right px-2 py-2.5 font-bold tabular-nums text-foreground">
                    {r.breakdown.total}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <Eye className="inline h-4 w-4 text-muted-foreground/70" aria-hidden="true" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {selected && (
        <ScoreBreakdownModal
          row={selected}
          isCurrent={selected.userId === currentUserId}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// Mismos colores del podio de /home (oro / plata / bronce) para coherencia.
const TIER_META: Record<number, { label: string; medalClass: string; cardClass: string }> = {
  1: { label: '1er lugar', medalClass: 'text-amber-500 fill-amber-400', cardClass: 'border-amber-400/50 bg-amber-400/15' },
  2: { label: '2do lugar', medalClass: 'text-zinc-400 fill-zinc-300', cardClass: 'border-zinc-400/50 bg-zinc-400/15' },
  3: { label: '3er lugar', medalClass: 'text-amber-700 fill-amber-700/40', cardClass: 'border-amber-700/50 bg-amber-700/15' },
};

function PodiumTier({
  rank,
  players,
  currentUserId,
  onSelect,
}: {
  rank: number;
  players: RankingRow[];
  currentUserId: string;
  onSelect: (row: RankingRow) => void;
}) {
  const meta = TIER_META[rank];
  const Icon = rank === 1 ? Crown : Medal;
  // Título del puesto ARRIBA de la card y los jugadores como lista (uno por
  // línea, alineados a la izquierda). Si hay varios, el empate es evidente
  // por sí solo — sin etiqueta redundante.
  return (
    <div className={cn('rounded-xl border p-3 space-y-2', meta.cardClass)}>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Icon className={cn('h-5 w-5', meta.medalClass)} />
        {meta.label}
      </span>
      <ul className="space-y-1">
        {players.map((p) => (
          <li key={p.userId}>
            <button
              type="button"
              onClick={() => onSelect(p)}
              className="flex w-full items-center gap-2.5 rounded-lg p-1 -m-1 text-left hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
            >
              <Avatar avatarUrl={p.avatarUrl} size={28} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                {p.name}
                {p.userId === currentUserId && <span className="text-primary"> (tú)</span>}
              </span>
              <span className="flex-shrink-0 text-xs text-muted-foreground tabular-nums">
                {p.breakdown.total} pts
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Avatar({ avatarUrl, size }: { avatarUrl: string | null; size: number }) {
  if (!avatarUrl) {
    return (
      <span
        className="rounded-full bg-muted inline-block flex-shrink-0"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }
  return (
    <Image
      src={avatarUrl}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="rounded-full bg-muted flex-shrink-0"
    />
  );
}
