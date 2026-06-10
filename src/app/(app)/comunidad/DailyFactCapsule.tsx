import type { DailyFactToday } from '@/lib/daily-facts';

interface DailyFactCapsuleProps {
  view: DailyFactToday;
}

/**
 * "Dato curioso del día ⚽" — cápsula informativa al tope de Comunidad.
 * Puramente presentacional: el dato y el "Día N de 40" los calcula el server
 * (TZ Bogotá) y los pasa por props. Importa el tipo con `import type` para que
 * el catálogo de 40 datos no entre al bundle del cliente.
 */
export function DailyFactCapsule({ view }: DailyFactCapsuleProps) {
  return (
    <section
      aria-label="Dato curioso del día"
      className="rounded-xl border border-tertiary/30 bg-tertiary/5 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-tertiary">
          <span aria-hidden>💡</span> Dato curioso del día
        </span>
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums whitespace-nowrap">
          Día {view.day} de {view.total}
        </span>
      </div>

      <h3 className="mt-2.5 text-base sm:text-lg font-bold leading-snug text-foreground">
        {view.title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-foreground/90">{view.text}</p>

      <span className="mt-3 inline-flex items-center rounded-full bg-tertiary/10 px-2 py-0.5 text-[11px] font-medium text-tertiary">
        {view.categoryLabel}
      </span>
    </section>
  );
}
