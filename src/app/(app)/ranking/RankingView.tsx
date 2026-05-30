import Image from 'next/image';
import { Crown, Info, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScoreBreakdown } from '@/lib/scoring';

export interface RankingRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  breakdown: ScoreBreakdown;
  /** Posición (ranking de competición: empates comparten número). */
  rank: number;
}

interface RankingViewProps {
  rows: RankingRow[];
  currentUserId: string;
  /** True si ya hay al menos un resultado oficial cargado. */
  hasResults: boolean;
}

export function RankingView({ rows, currentUserId, hasResults }: RankingViewProps) {
  const podium = hasResults ? rows.filter((r) => r.rank <= 3 && r.breakdown.total > 0) : [];

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

      {/* Podio (solo si ya hay puntos) */}
      {podium.length > 0 && (
        <section className="grid grid-cols-3 gap-2 sm:gap-3">
          {orderPodium(podium).map((r) => (
            <PodiumCard key={r.userId} row={r} isCurrent={r.userId === currentUserId} />
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
                  <td className="pl-4 pr-2 py-2.5 text-muted-foreground tabular-nums">
                    {r.rank}
                  </td>
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
                    {r.breakdown.groupExactCount}
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

/** Reordena el top-3 para mostrarlo 2 · 1 · 3 (el campeón al centro). */
function orderPodium(top: RankingRow[]): RankingRow[] {
  const first = top.find((r) => r.rank === 1);
  const second = top.find((r) => r.rank === 2);
  const third = top.find((r) => r.rank === 3);
  return [second, first, third].filter((r): r is RankingRow => !!r);
}

function PodiumCard({ row, isCurrent }: { row: RankingRow; isCurrent: boolean }) {
  const isFirst = row.rank === 1;
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center',
        isFirst ? 'border-primary/40 bg-primary/[0.06]' : 'border-border bg-surface',
        isFirst ? 'pt-4' : 'mt-3 sm:mt-5',
      )}
    >
      <div className="relative">
        <Avatar avatarUrl={row.avatarUrl} size={isFirst ? 56 : 44} />
        <span className="absolute -top-1 -right-1">
          {row.rank === 1 ? (
            <Crown className="h-5 w-5 text-amber-500 fill-amber-400" />
          ) : (
            <Medal className={cn('h-4 w-4', row.rank === 2 ? 'text-zinc-400' : 'text-amber-700')} />
          )}
        </span>
      </div>
      <span className="text-[13px] font-medium text-foreground truncate max-w-full">
        {row.name}
        {isCurrent && <span className="text-primary"> (tú)</span>}
      </span>
      <span className="text-lg font-bold tabular-nums text-foreground">
        {row.breakdown.total}
        <span className="text-xs font-normal text-muted-foreground ml-0.5">pts</span>
      </span>
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
