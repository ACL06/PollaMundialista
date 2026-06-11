import Link from 'next/link';
import { Hourglass, ListChecks, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeStandingCardProps {
  /** Posición en el ranking, o null si aún no hay resultados / no participa. */
  rank: number | null;
  /** Total de participantes (inscritos) en el ranking. */
  participants: number;
  total: number;
  /** Marcadores exactos (grupos + eliminatoria). */
  exactCount: number;
  /** True si ya hay al menos un resultado oficial cargado. */
  hasResults: boolean;
}

/**
 * Accesos como "tiles" en una sola fila (grid de 3): icono arriba + label,
 * cada uno con su acento de la paleta tricolor — más presencia que los
 * botones planos anteriores, sin salirse del design system.
 */
const tileBase = cn(
  'flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 px-1',
  'text-[12px] sm:text-[13px] font-semibold whitespace-nowrap transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
);

/**
 * Tarjeta de /home una vez arrancado el Mundial (post-lock): reemplaza el
 * countdown/progreso del pronóstico por el foco de la fase en curso —
 * tu posición en el ranking + accesos a Ranking y Comunidad. Si todavía no
 * hay resultados oficiales, muestra un estado de espera.
 */
export function HomeStandingCard({
  rank,
  participants,
  total,
  exactCount,
  hasResults,
}: HomeStandingCardProps) {
  const showPosition = hasResults && rank != null;

  return (
    <section className="bg-surface border border-border rounded-xl p-5 sm:p-6 text-left flex flex-col gap-4">
      <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full text-sm font-semibold bg-primary/10 text-primary">
        <Trophy className="h-4 w-4" />
        El Mundial está en marcha
      </div>

      {showPosition ? (
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center rounded-xl bg-tertiary/10 text-tertiary px-4 py-3 min-w-[84px]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Posición</span>
            <span className="text-3xl font-bold tabular-nums leading-none mt-0.5">#{rank}</span>
            <span className="text-[11px] text-muted-foreground mt-1">de {participants}</span>
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground tabular-nums">{total} pts</p>
            <p className="text-sm text-muted-foreground">
              {exactCount} {exactCount === 1 ? 'marcador exacto' : 'marcadores exactos'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Hourglass className="h-5 w-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            Tu pronóstico quedó registrado como definitivo. 🍀 Tu posición aparecerá aquí apenas
            se carguen los primeros resultados oficiales.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-1">
        <Link
          href="/ranking"
          className={cn(tileBase, 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20')}
        >
          <Trophy className="h-5 w-5" />
          Ranking
        </Link>
        <Link
          href="/comunidad"
          className={cn(tileBase, 'border-tertiary/40 bg-tertiary/10 text-tertiary hover:bg-tertiary/20')}
        >
          <Users className="h-5 w-5" />
          Comunidad
        </Link>
        <Link
          href="/pronosticos"
          className={cn(tileBase, 'border-border bg-muted/60 text-foreground hover:bg-muted')}
        >
          <ListChecks className="h-5 w-5" />
          Mi pronóstico
        </Link>
      </div>
    </section>
  );
}
