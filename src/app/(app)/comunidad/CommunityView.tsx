'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Crown, Flame, Users } from 'lucide-react';
import { TeamLabel } from '@/components/calendar/TeamLabel';
import { BracketSlot } from '@/components/calendar/BracketSlot';
import {
  formatMatchDateKey,
  formatMatchDateLong,
  formatMatchTime,
} from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { Match, Team } from '@/lib/types/match';
import { displayName, type ChampionPick, type CommunityScore, type PublicProfile } from './shared';

interface CommunityViewProps {
  groupMatches: Match[];
  scores: CommunityScore[];
  profiles: PublicProfile[];
  participants: PublicProfile[];
  teams: Team[];
  championPicks: ChampionPick[];
}

type Outcome = 'home' | 'draw' | 'away';

function outcomeOf(home: number, away: number): Outcome {
  if (home > away) return 'home';
  if (home < away) return 'away';
  return 'draw';
}

export function CommunityView({
  groupMatches,
  scores,
  profiles,
  participants,
  teams,
  championPicks,
}: CommunityViewProps) {
  const profileById = useMemo(() => {
    const map = new Map<string, PublicProfile>();
    for (const p of profiles) map.set(p.id, p);
    return map;
  }, [profiles]);

  const teamsByCode = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.code, t);
    return map;
  }, [teams]);

  // ── Distribución de campeones ─────────────────────────────────────
  const championDist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of championPicks) {
      if (!p.champion_code) continue;
      counts.set(p.champion_code, (counts.get(p.champion_code) ?? 0) + 1);
    }
    const rows = Array.from(counts.entries())
      .map(([code, count]) => ({ team: teamsByCode.get(code), count }))
      .filter((r): r is { team: Team; count: number } => !!r.team)
      .sort((a, b) => b.count - a.count || a.team.name.localeCompare(b.team.name));
    const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
    return { rows, max };
  }, [championPicks, teamsByCode]);

  // ── Pronósticos por partido + consenso ────────────────────────────
  const predictionsByMatch = useMemo(() => {
    const map = new Map<string, Array<{ userId: string; home: number; away: number }>>();
    for (const s of scores) {
      if (!map.has(s.match_id)) map.set(s.match_id, []);
      map.get(s.match_id)!.push({ userId: s.user_id, home: s.home_score, away: s.away_score });
    }
    return map;
  }, [scores]);

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
          Los pronósticos de todos, abiertos para que sea transparente.
        </p>
      </header>

      {/* Distribución de campeones */}
      {championDist.rows.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <Crown className="h-4 w-4 text-amber-500" />
            El campeón de la polla
          </h2>
          <div className="rounded-lg border border-border bg-surface p-4 space-y-2.5">
            {championDist.rows.map(({ team, count }) => (
              <div key={team.code} className="flex items-center gap-3">
                <span
                  className={cn(
                    `fi fi-${team.flag} rounded-sm flex-shrink-0`,
                    'shadow-[0_0_0_1px_hsl(var(--border))]',
                  )}
                  style={{ width: 22, height: 16 }}
                  aria-hidden="true"
                />
                <span className="text-[13px] text-foreground w-28 truncate">{team.name}</span>
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(count / championDist.max) * 100}%` }}
                  />
                </div>
                <span className="text-[13px] font-bold tabular-nums text-foreground w-6 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Participantes → pronóstico completo */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          <Users className="h-4 w-4" />
          Participantes ({participants.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => {
            const favTeam = p.favorite_team ? teamsByCode.get(p.favorite_team) : null;
            return (
              <Link
                key={p.id}
                href={`/comunidad/${p.id}`}
                className={cn(
                  'inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border border-border bg-surface',
                  'text-[13px] font-medium text-foreground hover:border-foreground/20 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
                )}
              >
                <Avatar profile={p} size={22} />
                <span>{displayName(p)}</span>
                {favTeam && (
                  <span
                    className={`fi fi-${favTeam.flag} rounded-sm`}
                    style={{ width: 16, height: 12 }}
                    aria-hidden="true"
                  />
                )}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            );
          })}
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

      {selectedDay && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {selectedDay.label}
          </h2>
          {selectedDay.matches.map((match) => (
            <MatchPredictions
              key={match.id}
              match={match}
              preds={predictionsByMatch.get(match.id) ?? []}
              profileById={profileById}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MatchPredictionsProps {
  match: Match;
  preds: Array<{ userId: string; home: number; away: number }>;
  profileById: Map<string, PublicProfile>;
}

function MatchPredictions({ match, preds, profileById }: MatchPredictionsProps) {
  // Consenso 1X2
  const counts = { home: 0, draw: 0, away: 0 };
  for (const p of preds) counts[outcomeOf(p.home, p.away)] += 1;
  const total = preds.length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  // Outcome mayoritario y si hay un favorito claro (≥60%) para marcar rebeldes
  const modal: Outcome = counts.home >= counts.draw && counts.home >= counts.away
    ? 'home'
    : counts.away >= counts.draw
      ? 'away'
      : 'draw';
  const modalShare = total > 0 ? Math.max(counts.home, counts.draw, counts.away) / total : 0;
  const hasClearFavorite = modalShare >= 0.6 && total >= 3;

  // Marcador más repetido
  const scoreCounts = new Map<string, number>();
  for (const p of preds) {
    const k = `${p.home}-${p.away}`;
    scoreCounts.set(k, (scoreCounts.get(k) ?? 0) + 1);
  }
  let topScore: string | null = null;
  let topScoreCount = 0;
  for (const [k, c] of scoreCounts) {
    if (c > topScoreCount) {
      topScore = k;
      topScoreCount = c;
    }
  }

  const homeName = match.home_team?.name ?? 'Local';
  const awayName = match.away_team?.name ?? 'Visitante';

  const sorted = [...preds].sort((a, b) => {
    const na = displayName(profileById.get(a.userId) ?? {});
    const nb = displayName(profileById.get(b.userId) ?? {});
    return na.localeCompare(nb);
  });

  return (
    <article className="border border-border bg-surface rounded-lg overflow-hidden">
      {/* Cabecera del partido */}
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

      {/* Consenso */}
      {total > 0 && (
        <div className="px-4 py-2.5 border-b border-border/60 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
          <span className="text-muted-foreground">Consenso:</span>
          <span className="text-foreground">
            {homeName} <strong className="tabular-nums">{pct(counts.home)}%</strong>
          </span>
          <span className="text-foreground">
            Empate <strong className="tabular-nums">{pct(counts.draw)}%</strong>
          </span>
          <span className="text-foreground">
            {awayName} <strong className="tabular-nums">{pct(counts.away)}%</strong>
          </span>
          {topScore && topScoreCount > 1 && (
            <span className="text-muted-foreground">
              · más repetido <strong className="text-foreground">{topScore.replace('-', ' – ')}</strong>
            </span>
          )}
        </div>
      )}

      {preds.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-muted-foreground italic">
          Nadie pronosticó este partido.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {sorted.map((p) => {
            const profile = profileById.get(p.userId);
            const isRebel = hasClearFavorite && outcomeOf(p.home, p.away) !== modal;
            return (
              <li key={p.userId} className="flex items-center gap-2.5 px-4 py-2">
                {profile && <Avatar profile={profile} size={22} />}
                <span className="text-[14px] text-foreground truncate flex-1">
                  {displayName(profile ?? {})}
                </span>
                {isRebel && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                    <Flame className="h-3 w-3" />
                    va solo
                  </span>
                )}
                <span className="font-mono font-bold text-[15px] tabular-nums text-foreground whitespace-nowrap">
                  {p.home} – {p.away}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

function Avatar({ profile, size }: { profile: PublicProfile; size: number }) {
  if (!profile.avatar_url) {
    return (
      <span
        className="rounded-full bg-muted flex-shrink-0 inline-block"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }
  return (
    <Image
      src={profile.avatar_url}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="rounded-full bg-muted flex-shrink-0"
    />
  );
}
