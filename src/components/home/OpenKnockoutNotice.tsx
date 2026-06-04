import Link from 'next/link';
import { ArrowRight, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Aviso en /home cuando hay cruces de eliminatoria ABIERTOS (equipos ya
 * definidos + el partido no arrancó) que el usuario aún no ha pronosticado.
 * Solo se renderiza si `count > 0` (lo decide /home). Empuja a la pestaña
 * "Eliminatorias" para no perder la ventana de captura por partido.
 */
export function OpenKnockoutNotice({ count }: { count: number }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-tertiary/40 bg-tertiary/10 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-tertiary/15 text-tertiary">
          <Swords className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">
            {count === 1
              ? 'Tienes 1 cruce de eliminatoria abierto'
              : `Tienes ${count} cruces de eliminatoria abiertos`}
          </h2>
          <p className="text-sm text-muted-foreground">
            Ya se conocen los equipos. Predice el marcador antes de que arranque cada partido — la
            ventana se cierra en el pitazo inicial.
          </p>
        </div>
      </div>
      <Link
        href="/pronosticos?tab=eliminatorias"
        className={cn(
          'inline-flex items-center justify-center gap-2 self-start rounded-lg h-11 px-5 text-sm font-medium',
          'bg-primary text-primary-foreground hover:brightness-110 transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        Pronosticar marcadores
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
