'use client';

import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GAME_RULES, MAX_POINTS } from '@/lib/game-rules';

/**
 * Sección "Reglas del juego" en /home. Cada regla muestra un texto corto
 * + su puntaje; al tocar el ícono de info (azul) se despliega el detalle
 * con un ejemplo.
 */
export function GameRules() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="bg-surface border border-border rounded-xl p-5 sm:p-6 flex flex-col gap-3 text-left">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Reglas del juego</h2>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          máx <span className="font-bold text-foreground tabular-nums">{MAX_POINTS}</span> pts
        </span>
      </div>

      <ul className="divide-y divide-border/60">
        {GAME_RULES.map((rule) => {
          const isOpen = openId === rule.id;
          return (
            <li key={rule.id} className="py-2.5">
              <div className="flex items-center gap-2">
                {rule.points && (
                  <span className="inline-flex items-center justify-center rounded-md bg-primary/10 text-primary text-[11px] font-bold px-1.5 py-0.5 tabular-nums whitespace-nowrap flex-shrink-0 min-w-[3.2rem]">
                    {rule.points}
                  </span>
                )}
                <span className="text-sm text-foreground flex-1 min-w-0">{rule.label}</span>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : rule.id)}
                  aria-expanded={isOpen}
                  aria-label={`Ver detalle: ${rule.label}`}
                  className={cn(
                    'inline-flex items-center justify-center h-6 w-6 rounded-full flex-shrink-0 transition-colors',
                    'text-tertiary hover:bg-tertiary/10',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
                  )}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                </button>
              </div>
              {isOpen && (
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground bg-muted/40 rounded-lg p-3">
                  {rule.detail}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
