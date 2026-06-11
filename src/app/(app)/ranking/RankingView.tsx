import { Info } from 'lucide-react';
import { RankingBoard } from './RankingBoard';
import type { RankingRow } from './types';

interface RankingViewProps {
  rows: RankingRow[];
  currentUserId: string;
  /** True si ya hay al menos un resultado oficial cargado. */
  hasResults: boolean;
  /** Partidos con resultado oficial / total del torneo (104). */
  finishedCount: number;
  totalMatches: number;
}

export function RankingView({
  rows,
  currentUserId,
  hasResults,
  finishedCount,
  totalMatches,
}: RankingViewProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-7">
      <header className="space-y-1">
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-foreground">
          Ranking
        </h1>
        <p className="text-sm text-muted-foreground">
          Puntos acumulados según los resultados oficiales
          {totalMatches > 0 && (
            <>
              {' · '}
              <span className="tabular-nums">
                {finishedCount} de {totalMatches}
              </span>{' '}
              partidos jugados
            </>
          )}
          {' · '}
          <span className="tabular-nums">{rows.length}</span> participantes.
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

      <RankingBoard rows={rows} currentUserId={currentUserId} hasResults={hasResults} />
    </div>
  );
}
