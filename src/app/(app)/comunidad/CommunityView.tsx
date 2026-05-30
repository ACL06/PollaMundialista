'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import { TeamLabel } from '@/components/calendar/TeamLabel';
import { BracketSlot } from '@/components/calendar/BracketSlot';
import {
  formatMatchDateKey,
  formatMatchDateLong,
  formatMatchTime,
} from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { Match } from '@/lib/types/match';
import { displayName, type CommunityScore, type PublicProfile } from './shared';

interface CommunityViewProps {
  groupMatches: Match[];
  scores: CommunityScore[];
  profiles: PublicProfile[];
  participants: PublicProfile[];
}

export function CommunityView({ groupMatches, scores, profiles, participants }: CommunityViewProps) {
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of profiles) map.set(p.id, displayName(p));
    return map;
  }, [profiles]);

  // match_id → lista de pronósticos (nickname + marcador), ordenada por nick.
  const predictionsByMatch = useMemo(() => {
    const map = new Map<string, Array<{ userId: string; nickname: string; home: number; away: number }>>();
    for (const s of scores) {
      if (!map.has(s.match_id)) map.set(s.match_id, []);
      map.get(s.match_id)!.push({
        userId: s.user_id,
        nickname: nameById.get(s.user_id) ?? 'Jugador',
        home: s.home_score,
        away: s.away_score,
      });
    }
    for (const list of map.values()) list.sort((a, b) => a.nickname.localeCompare(b.nickname));
    return map;
  }, [scores, nameById]);

  // Agrupar partidos por día
  const days = useMemo(() => {
    const grouped = new Map<string, { key: string; label: string; matches: Match[] }>();
    for (const m of groupMatches) {
      const date = new Date(m.kicks_off_at);
      const key = formatMatchDateKey(date);
      if (!grouped.has(key)) grouped.set(key, { key, label: formatMatchDateLong(date), matches: [] });
      grouped.get(key)!.matches.push(m);
    }
    return Array.from(grouped.values());
  }, [groupMatches]);

  const [selectedDayKey, setSelectedDayKey] = useState(() => days[0]?.key ?? '');
  const selectedDay = days.find((d) => d.key === selectedDayKey) ?? days[0];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-7">
      <header className="space-y-1">
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-foreground">
          Comunidad
        </h1>
        <p className="text-sm text-muted-foreground">
          Los pronósticos de todos, abiertos para que sea transparente. Mira qué predijo cada
          quien en cada partido.
        </p>
      </header>

      {/* Participantes → pronóstico completo */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          <Users className="h-4 w-4" />
          Participantes ({participants.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <Link
              key={p.id}
              href={`/comunidad/${p.id}`}
              className={cn(
                'inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-full border border-border bg-surface',
                'text-[13px] font-medium text-foreground hover:border-foreground/20 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
              )}
            >
              <span>{displayName(p)}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      {/* Tabs por día */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" role="tablist">
        {days.map((day) => {
          const isActive = day.key === selectedDay?.key;
          return (
            <button
              key={day.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedDayKey(day.key)}
              className={cn(
                'flex-shrink-0 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {new Date(day.key).toLocaleDateString('es-CO', {
                day: 'numeric',
                month: 'short',
                timeZone: 'America/Bogota',
              })}
            </button>
          );
        })}
      </div>

      {/* Partidos del día con los pronósticos de todos */}
      {selectedDay && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {selectedDay.label}
          </h2>
          {selectedDay.matches.map((match) => {
            const preds = predictionsByMatch.get(match.id) ?? [];
            return (
              <article
                key={match.id}
                className="border border-border bg-surface rounded-lg overflow-hidden"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-center px-4 py-3 border-b border-border bg-muted/30">
                  {match.home_team ? (
                    <TeamLabel team={match.home_team} align="right" />
                  ) : (
                    <BracketSlot source={match.bracket_source_home} align="right" />
                  )}
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    {formatMatchTime(new Date(match.kicks_off_at))}
                  </span>
                  {match.away_team ? (
                    <TeamLabel team={match.away_team} align="left" />
                  ) : (
                    <BracketSlot source={match.bracket_source_away} align="left" />
                  )}
                </div>

                {preds.length === 0 ? (
                  <p className="px-4 py-3 text-[13px] text-muted-foreground italic">
                    Nadie pronosticó este partido.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {preds.map((p) => (
                      <li
                        key={p.userId}
                        className="flex items-center justify-between gap-3 px-4 py-2"
                      >
                        <span className="text-[14px] text-foreground truncate">{p.nickname}</span>
                        <span className="font-mono font-bold text-[15px] tabular-nums text-foreground whitespace-nowrap">
                          {p.home} – {p.away}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
