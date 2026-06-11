import { Info, Trophy } from 'lucide-react';
import { WelcomeModal } from '@/components/app/WelcomeModal';
import { RankingBoard } from './RankingBoard';
import type { RankingRow } from './types';

/** Bienvenida one-time de la sección (localStorage, por dispositivo). */
const WELCOME_ITEMS = [
  { emoji: '📈', text: 'Tu posición y tus puntos se actualizan con cada partido finalizado.' },
  { emoji: '🥇', text: 'Podio en vivo: los empatados comparten puesto.' },
  { emoji: '🔍', text: 'Toca a cualquier participante para ver el desglose de cómo sumó sus puntos.' },
  { emoji: '⚽', text: 'Arriba ves el avance del torneo: cuántos de los 104 partidos ya se jugaron.' },
];

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
      {/* Bienvenida one-time a la sección (se muestra una sola vez por dispositivo). */}
      <WelcomeModal
        storageKey="ranking"
        icon={Trophy}
        title="¡Arrancó el Ranking! 🏆"
        intro="Acá se define quién manda en la polla. Cada resultado oficial mueve la tabla:"
        items={WELCOME_ITEMS}
        ctaLabel="¡A sumar puntos! 💪"
      />

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
