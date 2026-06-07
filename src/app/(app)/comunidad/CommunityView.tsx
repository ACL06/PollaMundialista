'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, ChevronRight, Crown, Flame, ListOrdered, Sparkles, SmilePlus, Target, Trophy, Users } from 'lucide-react';
import { TeamLabel } from '@/components/calendar/TeamLabel';
import { BracketSlot } from '@/components/calendar/BracketSlot';
import {
  formatMatchDateKey,
  formatMatchDateLong,
  formatMatchTime,
} from '@/lib/format-date';
import { SCORING, normalizeScorer } from '@/lib/scoring';
import { useCenterActiveTab } from '@/lib/use-center-active-tab';
import { cn } from '@/lib/utils';
import type { Match, Team } from '@/lib/types/match';
import {
  displayName,
  REACTIONS,
  type CommunityScore,
  type PredictionPick,
  type PublicProfile,
  type ReactionKey,
  type ReactionRow,
} from './shared';
import { toggleReaction } from './actions';

interface CommunityViewProps {
  groupMatches: Match[];
  scores: CommunityScore[];
  profiles: PublicProfile[];
  participants: PublicProfile[];
  teams: Team[];
  picks: PredictionPick[];
  reactions: ReactionRow[];
  currentUserId: string;
  /** Hora del servidor (ISO) para elegir el día por defecto sin desfasar SSR. */
  nowIso: string;
}

/** Clave de un pronóstico concreto: el de {targetUserId} en {matchId}. */
function reactionKeyOf(targetUserId: string, matchId: string): string {
  return `${targetUserId}|${matchId}`;
}

type Outcome = 'home' | 'draw' | 'away';

function outcomeOf(home: number, away: number): Outcome {
  if (home > away) return 'home';
  if (home < away) return 'away';
  return 'draw';
}

/** Marcador oficial de un partido (solo si está finalizado con marcador). */
function officialResult(m: Match): { home: number; away: number } | null {
  if (m.status === 'final' && m.home_score != null && m.away_score != null) {
    return { home: m.home_score, away: m.away_score };
  }
  return null;
}

type Verdict = 'exact' | 'outcome' | 'miss';

/** Compara un marcador pronosticado contra el resultado real. */
function verdictOf(predHome: number, predAway: number, real: { home: number; away: number }): Verdict {
  if (predHome === real.home && predAway === real.away) return 'exact';
  if (outcomeOf(predHome, predAway) === outcomeOf(real.home, real.away)) return 'outcome';
  return 'miss';
}

function verdictPoints(v: Verdict): number {
  return v === 'exact' ? SCORING.groupExact : v === 'outcome' ? SCORING.groupOutcome : 0;
}

export function CommunityView({
  groupMatches,
  scores,
  profiles,
  participants,
  teams,
  picks,
  reactions,
  currentUserId,
  nowIso,
}: CommunityViewProps) {
  // Estado de reacciones: clave `target|match` → Map<reactorId, ReactionKey>.
  const [reactionState, setReactionState] = useState<Map<string, Map<string, ReactionKey>>>(
    () => {
      const map = new Map<string, Map<string, ReactionKey>>();
      for (const r of reactions) {
        const k = reactionKeyOf(r.target_user_id, r.match_id);
        if (!map.has(k)) map.set(k, new Map());
        map.get(k)!.set(r.reactor_id, r.reaction);
      }
      return map;
    },
  );
  // Qué fila tiene el selector de emojis abierto (`target|match`), o null.
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  // Acordeón: solo un partido con sus marcadores expandido a la vez.
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);
  const [, startReact] = useTransition();

  const handleReact = (targetUserId: string, matchId: string, reaction: ReactionKey) => {
    if (targetUserId === currentUserId) return;
    const k = reactionKeyOf(targetUserId, matchId);
    const snapshot = reactionState;

    // Optimista
    const nextOuter = new Map(reactionState);
    const inner = new Map(nextOuter.get(k) ?? []);
    if (inner.get(currentUserId) === reaction) inner.delete(currentUserId);
    else inner.set(currentUserId, reaction);
    nextOuter.set(k, inner);
    setReactionState(nextOuter);
    setOpenPicker(null);

    startReact(async () => {
      const res = await toggleReaction({ targetUserId, matchId, reaction });
      if (res.error) setReactionState(snapshot); // revertir
    });
  };

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
    for (const p of picks) {
      if (!p.champion_code) continue;
      counts.set(p.champion_code, (counts.get(p.champion_code) ?? 0) + 1);
    }
    const rows = Array.from(counts.entries())
      .map(([code, count]) => ({ team: teamsByCode.get(code), count }))
      .filter((r): r is { team: Team; count: number } => !!r.team)
      .sort((a, b) => b.count - a.count || a.team.name.localeCompare(b.team.name));
    const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
    return { rows, max };
  }, [picks, teamsByCode]);

  // ── Finalistas más elegidos (campeón + subcampeón combinados) ──────
  const finalistsDist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of picks) {
      for (const code of [p.champion_code, p.runner_up_code]) {
        if (!code) continue;
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }
    const rows = Array.from(counts.entries())
      .map(([code, count]) => ({ team: teamsByCode.get(code), count }))
      .filter((r): r is { team: Team; count: number } => !!r.team)
      .sort((a, b) => b.count - a.count || a.team.name.localeCompare(b.team.name))
      .slice(0, 8);
    const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
    return { rows, max };
  }, [picks, teamsByCode]);

  // ── Goleadores más elegidos (top 5, agrupados sin acentos/mayúsculas) ──
  const topScorers = useMemo(() => {
    const groups = new Map<string, { spellings: Map<string, number>; count: number }>();
    for (const p of picks) {
      const raw = p.top_scorer?.trim();
      if (!raw) continue;
      const key = normalizeScorer(raw);
      if (!key) continue;
      let g = groups.get(key);
      if (!g) {
        g = { spellings: new Map(), count: 0 };
        groups.set(key, g);
      }
      g.count += 1;
      g.spellings.set(raw, (g.spellings.get(raw) ?? 0) + 1);
    }
    const rows = Array.from(groups.values()).map((g) => {
      let best = '';
      let bestN = 0;
      for (const [name, n] of g.spellings) {
        if (n > bestN) {
          best = name;
          bestN = n;
        }
      }
      return { name: best, count: g.count };
    });
    rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
    return { rows: rows.slice(0, 5), max };
  }, [picks]);

  // ── Pronósticos por partido ───────────────────────────────────────
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

  // Día por defecto = hoy si tiene partidos; si no, el próximo día con
  // partidos; si ya pasaron todos, el último. (las keys son YYYY-MM-DD,
  // comparables lexicográficamente porque van en orden cronológico).
  const [selectedDayKey, setSelectedDayKey] = useState(() => {
    if (days.length === 0) return '';
    const todayKey = formatMatchDateKey(new Date(nowIso));
    const today = days.find((d) => d.key === todayKey);
    if (today) return today.key;
    const upcoming = days.find((d) => d.key >= todayKey);
    return (upcoming ?? days[days.length - 1]).key;
  });
  const selectedDay = days.find((d) => d.key === selectedDayKey) ?? days[0];

  // Tabs de fecha con auto-centrado del activo (como el navbar/wizard).
  const { containerRef: dayTabsRef, activeRef: activeDayRef } =
    useCenterActiveTab<HTMLButtonElement>(selectedDay?.key);

  // Acordeón de partidos: por defecto todos CERRADOS. Al cambiar de día se
  // resetea (cierra) para no arrastrar el que estaba abierto del día anterior.
  useEffect(() => {
    setOpenMatchId(null);
  }, [selectedDayKey]);

  // Cerrar el selector de emojis al interactuar fuera (clic/touch en otra
  // parte, scroll o resize) — comportamiento estándar de un popover. Los clics
  // dentro del propio selector/botón (marcados con data-reaction-ui) no cierran.
  useEffect(() => {
    if (!openPicker) return;
    const close = () => setOpenPicker(null);
    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest('[data-reaction-ui]')) return;
      setOpenPicker(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', close, true); // capture: también scrolls internos
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [openPicker]);

  // ── Tabla del día: puntos de cada participante en los partidos del día
  //    que YA tienen resultado oficial. Null si el día no tiene resultados.
  const dayBoard = useMemo(() => {
    if (!selectedDay) return null;
    const finals = selectedDay.matches.filter((m) => officialResult(m));
    if (finals.length === 0) return null;

    const perUser = new Map<
      string,
      { points: number; exact: number; predicted: number; correct: number }
    >();
    for (const m of finals) {
      const real = officialResult(m)!;
      for (const p of predictionsByMatch.get(m.id) ?? []) {
        const v = verdictOf(p.home, p.away, real);
        const cur =
          perUser.get(p.userId) ?? { points: 0, exact: 0, predicted: 0, correct: 0 };
        cur.points += verdictPoints(v);
        cur.predicted += 1;
        if (v === 'exact') cur.exact += 1;
        if (v !== 'miss') cur.correct += 1;
        perUser.set(p.userId, cur);
      }
    }

    const rows = Array.from(perUser.entries())
      .map(([userId, s]) => ({
        userId,
        ...s,
        // Pleno = acertó (al menos el resultado) TODOS los partidos del día
        // que ya tienen marcador, habiendo pronosticado todos (mín. 2).
        pleno: finals.length >= 2 && s.predicted === finals.length && s.correct === finals.length,
      }))
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.exact - a.exact ||
          displayName(profileById.get(a.userId) ?? {}).localeCompare(
            displayName(profileById.get(b.userId) ?? {}),
          ),
      );
    return { finalsCount: finals.length, totalCount: selectedDay.matches.length, rows };
  }, [selectedDay, predictionsByMatch, profileById]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-7">
      {/* Sin título "Comunidad": ya lo indica la pestaña activa del navbar. */}
      <p className="text-sm text-muted-foreground">
        Los pronósticos de todos, abiertos para que sea transparente.
      </p>

      {/* Distribución de campeones */}
      {championDist.rows.length > 0 && (
        <Distribution
          title="El campeón de la polla"
          Icon={Crown}
          iconClass="text-amber-500"
          rows={championDist.rows}
          max={championDist.max}
        />
      )}

      {/* Finalistas más elegidos (campeón + subcampeón) */}
      {finalistsDist.rows.length > 0 && (
        <Distribution
          title="Finalistas más elegidos"
          Icon={Trophy}
          iconClass="text-tertiary"
          rows={finalistsDist.rows}
          max={finalistsDist.max}
        />
      )}

      {/* Goleadores más elegidos (top 5) */}
      {topScorers.rows.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <Target className="h-4 w-4 text-primary" />
            Goleadores más elegidos
          </h2>
          <div className="rounded-lg border border-border bg-surface p-4 space-y-2.5">
            {topScorers.rows.map((row, i) => (
              <div key={row.name} className="flex items-center gap-3">
                <span className="text-[13px] font-bold tabular-nums text-muted-foreground w-4 text-right">
                  {i + 1}
                </span>
                <span className="text-[13px] text-foreground w-32 truncate" title={row.name}>
                  {row.name}
                </span>
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(row.count / topScorers.max) * 100}%` }}
                  />
                </div>
                <span className="text-[13px] font-bold tabular-nums text-foreground w-6 text-right">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Participantes → pronóstico completo */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <Users className="h-4 w-4" />
            Participantes ({participants.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Toca un participante para ver su pronóstico completo.
          </p>
        </div>
        {/* Grid con scroll vertical: muestra varios y solo scrollea si hay muchos. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1 -mr-1">
          {participants.map((p) => {
            const favTeam = p.favorite_team ? teamsByCode.get(p.favorite_team) : null;
            const isYou = p.id === currentUserId;
            return (
              <Link
                key={p.id}
                href={`/comunidad/${p.id}`}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border bg-surface min-w-0',
                  'text-[13px] font-medium text-foreground hover:border-foreground/20 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
                  isYou ? 'border-primary/50 bg-primary/5' : 'border-border',
                )}
              >
                <Avatar profile={p} size={22} />
                <span className="flex-1 min-w-0 truncate">{displayName(p)}</span>
                {isYou && (
                  <span className="flex-shrink-0 text-[10px] font-bold uppercase text-primary">Tú</span>
                )}
                {favTeam && (
                  <span
                    className={`fi fi-${favTeam.flag} rounded-sm flex-shrink-0`}
                    style={{ width: 16, height: 12 }}
                    aria-hidden="true"
                  />
                )}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Tabs por día (auto-centra el activo al seleccionarlo) */}
      <div
        ref={dayTabsRef}
        className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scroll-smooth"
        role="tablist"
      >
        {days.map((day) => {
          const isActive = day.key === selectedDay?.key;
          return (
            <button
              key={day.key}
              ref={isActive ? activeDayRef : undefined}
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

      {/* Tabla del día (solo cuando hay resultados en el día seleccionado) */}
      {dayBoard && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <ListOrdered className="h-4 w-4 text-primary" />
            Tabla del día
            <span className="font-normal normal-case tracking-normal tabular-nums">
              {dayBoard.finalsCount}/{dayBoard.totalCount} con resultado
            </span>
          </h2>
          <div className="rounded-lg border border-border bg-surface divide-y divide-border/60 overflow-hidden">
            {dayBoard.rows.map((row, i) => {
              const profile = profileById.get(row.userId);
              const isYou = row.userId === currentUserId;
              return (
                <div
                  key={row.userId}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-2',
                    isYou && 'bg-primary/5',
                  )}
                >
                  <span className="text-[13px] font-bold tabular-nums text-muted-foreground w-5 text-right">
                    {i + 1}
                  </span>
                  {profile && <Avatar profile={profile} size={22} />}
                  <span className="text-[14px] text-foreground truncate flex-1">
                    {displayName(profile ?? {})}
                  </span>
                  {isYou && (
                    <span className="text-[10px] font-bold uppercase text-primary">Tú</span>
                  )}
                  {row.pleno && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                      <Sparkles className="h-3 w-3" />
                      Pleno
                    </span>
                  )}
                  {row.exact > 0 && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {row.exact} exacto{row.exact > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="text-[14px] font-bold tabular-nums text-foreground w-12 text-right">
                    {row.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
              reactionState={reactionState}
              currentUserId={currentUserId}
              openPicker={openPicker}
              setOpenPicker={setOpenPicker}
              onReact={handleReact}
              isOpen={openMatchId === match.id}
              onToggle={() => setOpenMatchId((cur) => (cur === match.id ? null : match.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Sección de distribución con barras (campeón / finalistas). */
function Distribution({
  title,
  Icon,
  iconClass,
  rows,
  max,
}: {
  title: string;
  Icon: typeof Crown;
  iconClass: string;
  rows: Array<{ team: Team; count: number }>;
  max: number;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        <Icon className={cn('h-4 w-4', iconClass)} />
        {title}
      </h2>
      <div className="rounded-lg border border-border bg-surface p-4 space-y-2.5">
        {rows.map(({ team, count }) => (
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
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="text-[13px] font-bold tabular-nums text-foreground w-6 text-right">
              {count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

interface MatchPredictionsProps {
  match: Match;
  preds: Array<{ userId: string; home: number; away: number }>;
  profileById: Map<string, PublicProfile>;
  reactionState: Map<string, Map<string, ReactionKey>>;
  currentUserId: string;
  openPicker: string | null;
  setOpenPicker: (key: string | null) => void;
  onReact: (targetUserId: string, matchId: string, reaction: ReactionKey) => void;
  /** Acordeón: si este partido tiene sus marcadores expandidos. */
  isOpen: boolean;
  onToggle: () => void;
}

function MatchPredictions({
  match,
  preds,
  profileById,
  reactionState,
  currentUserId,
  openPicker,
  setOpenPicker,
  onReact,
  isOpen,
  onToggle,
}: MatchPredictionsProps) {
  const real = officialResult(match);

  // Consenso 1X2
  const outcomeCounts = { home: 0, draw: 0, away: 0 };
  for (const p of preds) outcomeCounts[outcomeOf(p.home, p.away)] += 1;
  const total = preds.length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  // Outcome mayoritario y si hay un favorito claro (≥60%) para marcar rebeldes
  const modal: Outcome = outcomeCounts.home >= outcomeCounts.draw && outcomeCounts.home >= outcomeCounts.away
    ? 'home'
    : outcomeCounts.away >= outcomeCounts.draw
      ? 'away'
      : 'draw';
  const modalShare = total > 0 ? Math.max(outcomeCounts.home, outcomeCounts.draw, outcomeCounts.away) / total : 0;
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

  // Con resultado: ordenar por acierto (exacto → resultado → fallo), luego nombre.
  const verdictRank = (v: Verdict | null) => (v === 'exact' ? 0 : v === 'outcome' ? 1 : v === 'miss' ? 2 : 3);
  const sorted = [...preds].sort((a, b) => {
    if (real) {
      const r = verdictRank(verdictOf(a.home, a.away, real)) - verdictRank(verdictOf(b.home, b.away, real));
      if (r !== 0) return r;
    }
    return displayName(profileById.get(a.userId) ?? {}).localeCompare(
      displayName(profileById.get(b.userId) ?? {}),
    );
  });

  return (
    <article className="border border-border bg-surface rounded-lg overflow-hidden">
      {/* Cabecera clickeable: expande/colapsa los marcadores de todos */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tertiary"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-center">
          {match.home_team ? (
            <TeamLabel team={match.home_team} align="right" />
          ) : (
            <BracketSlot source={match.bracket_source_home} align="right" />
          )}
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground text-center">
            {real ? (
              <span className="inline-flex flex-col items-center gap-0.5">
                <span className="font-bold text-foreground text-[14px] tabular-nums">
                  {real.home} – {real.away}
                </span>
                <span className="text-[10px] text-primary">Final</span>
              </span>
            ) : (
              formatMatchTime(new Date(match.kicks_off_at))
            )}
          </span>
          {match.away_team ? (
            <TeamLabel team={match.away_team} align="left" />
          ) : (
            <BracketSlot source={match.bracket_source_away} align="left" />
          )}
        </div>
        {/* Indicador de expandir/colapsar */}
        <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground">
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
          <span>
            {isOpen
              ? 'Ocultar pronósticos'
              : total > 0
                ? `Ver ${total} pronóstico${total === 1 ? '' : 's'}`
                : 'Sin pronósticos'}
          </span>
        </div>
      </button>

      {/* Consenso */}
      {isOpen && total > 0 && (
        <div className="px-4 py-2.5 border-t border-border/60 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
          <span className="text-muted-foreground">Consenso:</span>
          <span className="text-foreground">
            {homeName} <strong className="tabular-nums">{pct(outcomeCounts.home)}%</strong>
          </span>
          <span className="text-foreground">
            Empate <strong className="tabular-nums">{pct(outcomeCounts.draw)}%</strong>
          </span>
          <span className="text-foreground">
            {awayName} <strong className="tabular-nums">{pct(outcomeCounts.away)}%</strong>
          </span>
          {topScore && topScoreCount > 1 && (
            <span className="text-muted-foreground">
              · más repetido <strong className="text-foreground">{topScore.replace('-', ' – ')}</strong>
            </span>
          )}
        </div>
      )}

      {isOpen && preds.length === 0 && (
        <p className="px-4 py-3 border-t border-border/60 text-[13px] text-muted-foreground italic">
          Nadie pronosticó este partido.
        </p>
      )}
      {isOpen && preds.length > 0 && (
        <ul className="divide-y divide-border/60">
          {sorted.map((p) => {
            const profile = profileById.get(p.userId);
            const isRebel = hasClearFavorite && outcomeOf(p.home, p.away) !== modal;
            const rk = reactionKeyOf(p.userId, match.id);
            const inner = reactionState.get(rk);
            const isOwn = p.userId === currentUserId;
            const verdict: Verdict | null = real ? verdictOf(p.home, p.away, real) : null;

            // Conteo por emoji + cuál eligió el usuario actual
            const reactionCounts = new Map<ReactionKey, number>();
            let myReaction: ReactionKey | undefined;
            if (inner) {
              for (const [reactor, key] of inner) {
                reactionCounts.set(key, (reactionCounts.get(key) ?? 0) + 1);
                if (reactor === currentUserId) myReaction = key;
              }
            }
            const isPickerOpen = openPicker === rk;

            return (
              <li key={p.userId} className={cn('px-4 py-2', isOwn && 'bg-primary/5')}>
                <div className="flex items-center gap-2.5">
                  {profile && <Avatar profile={profile} size={22} />}
                  <span className="text-[14px] text-foreground truncate flex-1">
                    {displayName(profile ?? {})}
                  </span>
                  {isOwn && <span className="text-[10px] font-bold uppercase text-primary">Tú</span>}
                  {isRebel && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                      <Flame className="h-3 w-3" />
                      va solo
                    </span>
                  )}
                  {verdict && <VerdictChip verdict={verdict} />}
                  <span className="font-mono font-bold text-[15px] tabular-nums text-foreground whitespace-nowrap">
                    {p.home} – {p.away}
                  </span>
                </div>

                {/* Reacciones: conteos + botón para reaccionar */}
                <div className="flex items-center gap-1.5 flex-wrap pl-[34px] mt-1">
                  {REACTIONS.filter((r) => (reactionCounts.get(r.key) ?? 0) > 0).map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      disabled={isOwn}
                      onClick={() => onReact(p.userId, match.id, r.key)}
                      className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[12px] tabular-nums border transition-colors',
                        myReaction === r.key
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-surface text-muted-foreground hover:text-foreground',
                        isOwn && 'cursor-default',
                      )}
                    >
                      <span>{r.emoji}</span>
                      <span>{reactionCounts.get(r.key)}</span>
                    </button>
                  ))}

                  {!isOwn && (
                    <div className="relative" data-reaction-ui>
                      <button
                        type="button"
                        onClick={() => setOpenPicker(isPickerOpen ? null : rk)}
                        aria-label="Reaccionar"
                        className={cn(
                          'inline-flex items-center justify-center h-6 w-6 rounded-full border transition-colors',
                          'border-border bg-surface text-muted-foreground hover:text-foreground',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
                        )}
                      >
                        <SmilePlus className="h-3.5 w-3.5" />
                      </button>
                      {isPickerOpen && (
                        <div className="absolute z-10 left-0 mt-1 flex gap-1 p-1 rounded-lg border border-border bg-surface shadow-md">
                          {REACTIONS.map((r) => (
                            <button
                              key={r.key}
                              type="button"
                              title={r.label}
                              onClick={() => onReact(p.userId, match.id, r.key)}
                              className={cn(
                                'h-8 w-8 rounded-md text-[18px] leading-none transition-transform hover:scale-110',
                                myReaction === r.key && 'bg-primary/10',
                              )}
                            >
                              {r.emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

/** Chip de acierto de un pronóstico contra el resultado oficial. */
function VerdictChip({ verdict }: { verdict: Verdict }) {
  if (verdict === 'exact') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary whitespace-nowrap">
        ✓ Exacto
      </span>
    );
  }
  if (verdict === 'outcome') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 whitespace-nowrap">
        ≈ Resultado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground whitespace-nowrap">
      ✗ Falló
    </span>
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
