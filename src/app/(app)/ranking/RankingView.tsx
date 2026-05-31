import Image from 'next/image';
import { Crown, Info, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RankingRow } from './types';

interface RankingViewProps {
  rows: RankingRow[];
  currentUserId: string;
  /** True si ya hay al menos un resultado oficial cargado. */
  hasResults: boolean;
}

export function RankingView({ rows, currentUserId, hasResults }: RankingViewProps) {
  // Posiciones del podio presentes (con puntos > 0). Con empates, una
  // posición puede tener varios jugadores y la siguiente se "salta"
  // (ranking de competición: dos en 1° → el siguiente es 3°).
  const podiumRanks = hasResults
    ? [1, 2, 3].filter((r) => rows.some((row) => row.rank === r && row.breakdown.total > 0))
    : [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-7">
      <header className="space-y-1">
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-foreground">
          Ranking
        </h1>
        <p className="text-sm text-muted-foreground">
          Puntos acumulados según los resultados oficiales. {rows.length} participantes.
        </p>
      </header>

      {!hasResults && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Aún no hay resultados oficiales cargados. El ranking se irá actualizando a medida
            que se registren los marcadores de cada partido.
          </span>
        </div>
      )}

      {/* Podio (solo si ya hay puntos). Soporta empates por posición. */}
      {podiumRanks.length > 0 && (
        <section className="space-y-2">
          {podiumRanks.map((rank) => (
            <PodiumTier
              key={rank}
              rank={rank}
              players={rows.filter((r) => r.rank === rank && r.breakdown.total > 0)}
              currentUserId={currentUserId}
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
              <th
                className="text-center font-medium px-2 py-2.5 w-16 hidden sm:table-cell"
                title="Marcadores exactos"
              >
                Exactos
              </th>
              <th className="text-right font-medium pr-4 pl-2 py-2.5 w-16">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isCurrent = r.userId === currentUserId;
              return (
                <tr
                  key={r.userId}
                  className={cn(
                    'border-b border-border/50 last:border-b-0',
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
                  <td className="text-center px-2 py-2.5 text-muted-foreground tabular-nums hidden sm:table-cell">
                    {r.breakdown.groupExactCount + r.breakdown.knockoutExactCount}
                  </td>
                  <td className="text-right pr-4 pl-2 py-2.5 font-bold tabular-nums text-foreground">
                    {r.breakdown.total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const TIER_META: Record<number, { label: string; medalClass: string; cardClass: string }> = {
  1: { label: '1er lugar', medalClass: 'text-amber-500', cardClass: 'border-primary/40 bg-primary/[0.06]' },
  2: { label: '2do lugar', medalClass: 'text-zinc-400', cardClass: 'border-border bg-surface' },
  3: { label: '3er lugar', medalClass: 'text-amber-700', cardClass: 'border-border bg-surface' },
};

function PodiumTier({
  rank,
  players,
  currentUserId,
}: {
  rank: number;
  players: RankingRow[];
  currentUserId: string;
}) {
  const meta = TIER_META[rank];
  const Icon = rank === 1 ? Crown : Medal;
  return (
    <div className={cn('rounded-xl border p-3 flex items-center gap-3', meta.cardClass)}>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground w-24 flex-shrink-0">
        <Icon className={cn('h-5 w-5', meta.medalClass)} />
        {meta.label}
      </span>
      <div className="flex flex-wrap gap-3 flex-1 min-w-0">
        {players.map((p) => (
          <div key={p.userId} className="flex items-center gap-2 min-w-0">
            <Avatar avatarUrl={p.avatarUrl} size={32} />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">
                {p.name}
                {p.userId === currentUserId && <span className="text-primary"> (tú)</span>}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">{p.breakdown.total} pts</p>
            </div>
          </div>
        ))}
        {players.length > 1 && (
          <span className="self-center text-[11px] text-muted-foreground italic">empate</span>
        )}
      </div>
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
