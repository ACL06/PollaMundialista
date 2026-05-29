'use client';

import { useMemo, useState } from 'react';
import { MatchCard } from '@/components/calendar/MatchCard';
import { formatMatchDateLong, formatMatchDateKey } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { Match } from '@/lib/types/match';

type Filter = 'all' | 'today' | 'upcoming' | 'group' | 'knockout';

const FILTER_OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'today', label: 'Hoy' },
  { value: 'upcoming', label: 'Por jugar' },
  { value: 'group', label: 'Grupos' },
  { value: 'knockout', label: 'Eliminatorias' },
];

interface CalendarListProps {
  matches: Match[];
}

export function CalendarList({ matches }: CalendarListProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return matches;
    if (filter === 'today') {
      const todayKey = formatMatchDateKey(new Date());
      return matches.filter(
        (m) => formatMatchDateKey(new Date(m.kicks_off_at)) === todayKey,
      );
    }
    if (filter === 'upcoming') {
      return matches.filter((m) => m.status === 'scheduled');
    }
    if (filter === 'group') {
      return matches.filter((m) => m.stage === 'group');
    }
    if (filter === 'knockout') {
      return matches.filter((m) => m.stage !== 'group');
    }
    return matches;
  }, [matches, filter]);

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
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[32px] leading-[1.1] font-bold tracking-tight text-foreground">
            Calendario
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {matches.length} {matches.length === 1 ? 'partido' : 'partidos'} programados
          </p>
        </div>
        <div className="inline-flex gap-1 p-1 bg-muted rounded-full">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                'px-[14px] py-1.5 rounded-full text-[13px] font-medium transition-all',
                'whitespace-nowrap',
                filter === value
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
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
