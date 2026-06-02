'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  LayoutGrid,
  Medal,
  Swords,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { MatchCard } from '@/components/calendar/MatchCard';
import { formatMatchDateLong, formatMatchDateKey } from '@/lib/format-date';
import { useCenterActiveTab } from '@/lib/use-center-active-tab';
import { cn } from '@/lib/utils';
import type { Match } from '@/lib/types/match';

type Filter =
  | 'all'
  | 'today'
  | 'upcoming'
  | 'r32'
  | 'r16'
  | 'qf'
  | 'sf'
  | '3rd'
  | 'final';

const FILTER_OPTIONS: Array<{ value: Filter; label: string; Icon: LucideIcon }> = [
  { value: 'all', label: 'Todos', Icon: LayoutGrid },
  { value: 'today', label: 'Hoy', Icon: CalendarDays },
  { value: 'upcoming', label: 'Por jugar', Icon: Clock },
  { value: 'r32', label: 'Eliminatorias de 32', Icon: Swords },
  { value: 'r16', label: 'Octavos de Final', Icon: Swords },
  { value: 'qf', label: 'Cuartos de Final', Icon: Swords },
  { value: 'sf', label: 'Semifinales', Icon: Swords },
  { value: '3rd', label: 'Tercer lugar', Icon: Medal },
  { value: 'final', label: 'Final', Icon: Trophy },
];

// Filtro "Grupos" se eliminó del calendario: las tablas de posiciones
// viven en /grupos. Si quieres ver los 72 partidos de grupos en este
// calendario, usa "Todos" y scrollea hasta antes del 28 de junio.
const STAGE_FILTERS = new Set(['r32', 'r16', 'qf', 'sf', '3rd', 'final']);

interface CalendarListProps {
  matches: Match[];
}

export function CalendarList({ matches }: CalendarListProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const { containerRef, activeRef } = useCenterActiveTab<HTMLButtonElement>(filter);

  // `todayKey` se mantiene en estado para que el filtro "Hoy" se actualice
  // cuando cruza la medianoche (Bogotá). Si calculáramos `new Date()` solo
  // dentro del useMemo, una pestaña abierta toda la noche quedaría
  // congelada en el día anterior hasta cambiar de filtro o recargar.
  const [todayKey, setTodayKey] = useState(() => formatMatchDateKey(new Date()));

  useEffect(() => {
    const update = () => setTodayKey(formatMatchDateKey(new Date()));
    // Refrescar al volver a la pestaña (caso más común)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVisibility);
    // Heartbeat por si la pestaña queda visible cruzando medianoche
    const interval = window.setInterval(update, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return matches;
    if (filter === 'today') {
      return matches.filter(
        (m) => formatMatchDateKey(new Date(m.kicks_off_at)) === todayKey,
      );
    }
    if (filter === 'upcoming') {
      return matches.filter((m) => m.status === 'scheduled');
    }
    if (STAGE_FILTERS.has(filter)) {
      return matches.filter((m) => m.stage === filter);
    }
    return matches;
  }, [matches, filter, todayKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; matches: Match[] }>();
    for (const m of filtered) {
      const date = new Date(m.kicks_off_at);
      const key = formatMatchDateKey(date);
      if (!map.has(key)) {
        map.set(key, { label: formatMatchDateLong(date), matches: [] });
      }
      map.get(key)!.matches.push(m);
    }
    return Array.from(map.values());
  }, [filtered]);

  return (
    <div className="max-w-[880px] mx-auto px-5 py-9 sm:py-10 flex flex-col gap-7">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-[32px] leading-[1.1] font-bold tracking-tight text-foreground">
            Calendario
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {matches.length} {matches.length === 1 ? 'partido' : 'partidos'} programados
          </p>
        </div>
        {/* Filtros: una sola fila scrolleable (con ícono por fase), el activo
          * queda centrado y un degradado a la derecha insinúa que hay más. */}
        <div className="relative">
          <div
            ref={containerRef}
            className="flex gap-1.5 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain scroll-smooth pb-1 -mx-1 px-1"
            role="tablist"
            aria-label="Filtrar partidos"
          >
            {FILTER_OPTIONS.map(({ value, label, Icon }) => {
              const isActive = filter === value;
              return (
                <button
                  key={value}
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setFilter(value)}
                  className={cn(
                    'inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent sm:hidden"
            aria-hidden="true"
          />
        </div>
      </header>

      {grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No hay partidos para este filtro.
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {grouped.map((day) => (
            <section key={day.label} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pb-2 border-b border-border">
                {day.label}
              </h2>
              <div className="flex flex-col gap-2.5">
                {day.matches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
