import Link from 'next/link';
import { ArrowRight, Hourglass, Trophy, Users } from 'lucide-react';
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

const ctaClass = cn(
  'inline-flex items-center justify-center gap-2 rounded-lg h-11 px-5 text-sm font-medium',
  'bg-primary text-primary-foreground hover:brightness-110 transition-all',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
);

const secondaryClass = cn(
  'inline-flex items-center justify-center gap-2 rounded-lg h-11 px-5 text-sm font-medium',
  'border border-border text-foreground hover:bg-muted transition-colors',
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

      <div className="flex flex-wrap gap-2 pt-1">
        <Link href="/ranking" className={ctaClass}>
          Ver ranking
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/comunidad" className={secondaryClass}>
          <Users className="h-4 w-4" />
          Comunidad
        </Link>
        <Link href="/pronosticos" className={secondaryClass}>
          Mi pronóstico
        </Link>
      </div>
    </section>
  );
}
