'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { BarChart3, Medal, X } from 'lucide-react';
import {
  BRACKET_ROUNDS,
  BRACKET_ROUND_LABEL,
  type PredictionBracketEntry,
  type PredictionBracketRound,
} from '@/lib/types/prediction';
import { SCORING } from '@/lib/scoring';
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock';
import { cn } from '@/lib/utils';
import { displayName, type PublicProfile } from './shared';
import type { Team } from '@/lib/types/match';

interface QualifiedSectionProps {
  /** Equipos que realmente alcanzaron cada ronda (asignados a los cruces). */
  advancers: Record<PredictionBracketRound, Set<string>>;
  /** Bracket de clasificados de todos los inscritos. */
  bracket: PredictionBracketEntry[];
  teamsByCode: Map<string, Team>;
  profileById: Map<string, PublicProfile>;
  totalParticipants: number;
  currentUserId: string;
}

/** Encabezado corto de cada ronda para la tabla de estadísticas. */
const ROUND_SHORT: Record<PredictionBracketRound, string> = {
  r32: '32',
  r16: '16',
  qf: '8',
  sf: '4',
};

const keyOf = (round: PredictionBracketRound, code: string) => `${round}|${code}`;
const pctOf = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

/**
 * Sección "Clasificados" de Comunidad (entre la tabla del día y el Top 5).
 * Por cada ronda con clasificados reales (equipos asignados a los cruces),
 * una fila de banderas; tocar una abre el modal de quiénes la eligieron.
 * El CTA "Ver estadísticas" abre el % de la polla por equipo y fase.
 * Se autogestiona: si no hay ni clasificados ni pronósticos, no se muestra.
 */
export function QualifiedSection({
  advancers,
  bracket,
  teamsByCode,
  profileById,
  totalParticipants,
  currentUserId,
}: QualifiedSectionProps) {
  // Electores por (ronda, equipo): userIds que pusieron ese equipo en esa ronda.
  const votersByRoundTeam = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const b of bracket) {
      const k = keyOf(b.round, b.team_code);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(b.user_id);
    }
    return map;
  }, [bracket]);

  // Rondas con clasificados reales (size > 0).
  const resolvedRounds = useMemo(
    () => BRACKET_ROUNDS.filter((r) => advancers[r].size > 0),
    [advancers],
  );

  const hasBracket = bracket.length > 0;
  const [detail, setDetail] = useState<{ round: PredictionBracketRound; code: string } | null>(
    null,
  );
  const [showStats, setShowStats] = useState(false);

  // Nada que mostrar: ni clasificados reales ni pronósticos de bracket.
  if (resolvedRounds.length === 0 && !hasBracket) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          <Medal className="h-4 w-4 text-primary" />
          Clasificados
        </h2>
        {hasBracket && (
          <button
            type="button"
            onClick={() => setShowStats(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-tertiary/40 bg-tertiary/5 px-3 py-1 text-xs font-medium text-tertiary hover:bg-tertiary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Ver estadísticas
          </button>
        )}
      </div>

      {resolvedRounds.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface divide-y divide-border/60">
          {resolvedRounds.map((round) => {
            const teams = Array.from(advancers[round])
              .map((code) => teamsByCode.get(code))
              .filter((t): t is Team => !!t)
              .sort((a, b) => a.name.localeCompare(b.name));
            return (
              <div key={round} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-foreground">
                    {BRACKET_ROUND_LABEL[round]}
                  </h3>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {teams.length} · {SCORING.bracket[round]} pts c/u
                  </span>
                </div>
                {/* Banderas con scroll horizontal; cada una abre sus electores. */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {teams.map((team) => {
                    const n = votersByRoundTeam.get(keyOf(round, team.code))?.length ?? 0;
                    return (
                      <button
                        key={team.code}
                        type="button"
                        onClick={() => setDetail({ round, code: team.code })}
                        title={`${team.name} · ${n} ${n === 1 ? 'lo eligió' : 'lo eligieron'}`}
                        className="flex-shrink-0 inline-flex flex-col items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
                      >
                        <span
                          className={cn(
                            `fi fi-${team.flag} rounded-sm`,
                            'shadow-[0_0_0_1px_hsl(var(--border))]',
                          )}
                          style={{ width: 30, height: 22 }}
                          aria-hidden="true"
                        />
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                          {team.code}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums text-tertiary">
                          {n}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-[13px] text-muted-foreground">
          Cuando empiecen las eliminatorias verás acá los equipos que pasaron y quién los tenía.
          Por ahora, mira en <strong className="text-foreground">Ver estadísticas</strong> a qué
          fase cree la polla que llega cada equipo.
        </p>
      )}

      {detail && (
        <VotersModal
          round={detail.round}
          team={teamsByCode.get(detail.code)!}
          voterIds={votersByRoundTeam.get(keyOf(detail.round, detail.code)) ?? []}
          qualified={advancers[detail.round].has(detail.code)}
          profileById={profileById}
          currentUserId={currentUserId}
          totalParticipants={totalParticipants}
          onClose={() => setDetail(null)}
        />
      )}

      {showStats && (
        <StatsModal
          bracket={bracket}
          teamsByCode={teamsByCode}
          totalParticipants={totalParticipants}
          onClose={() => setShowStats(false)}
          onPickTeam={(round, code) => {
            setShowStats(false);
            setDetail({ round, code });
          }}
        />
      )}
    </section>
  );
}

/** Modal: quiénes eligieron a {team} en {round}. */
function VotersModal({
  round,
  team,
  voterIds,
  qualified,
  profileById,
  currentUserId,
  totalParticipants,
  onClose,
}: {
  round: PredictionBracketRound;
  team: Team;
  voterIds: string[];
  qualified: boolean;
  profileById: Map<string, PublicProfile>;
  currentUserId: string;
  totalParticipants: number;
  onClose: () => void;
}) {
  useBodyScrollLock(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const voters = voterIds
    .map((id) => ({ id, profile: profileById.get(id) }))
    .sort((a, b) =>
      displayName(a.profile ?? {}).localeCompare(displayName(b.profile ?? {})),
    );
  const pct = pctOf(voterIds.length, totalParticipants);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <span
            className={cn(`fi fi-${team.flag} rounded-sm flex-shrink-0`, 'shadow-[0_0_0_1px_hsl(var(--border))]')}
            style={{ width: 34, height: 25 }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground truncate">{team.name}</h2>
            <p className="text-xs text-muted-foreground">{BRACKET_ROUND_LABEL[round]}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-foreground">
          <strong className="tabular-nums">{voterIds.length}</strong>{' '}
          {voterIds.length === 1 ? 'persona lo eligió' : 'personas lo eligieron'}{' '}
          <span className="text-muted-foreground">({pct}% de la polla)</span>
          {qualified && (
            <span className="text-primary font-medium"> · +{SCORING.bracket[round]} pts c/u</span>
          )}
        </p>

        {voters.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-0.5">
            {voters.map(({ id, profile }) => (
              <li
                key={id}
                className={cn(
                  'flex items-center gap-2.5 px-2 py-1.5 rounded-md',
                  id === currentUserId && 'bg-primary/5',
                )}
              >
                <Avatar profile={profile} size={24} />
                <span className="text-sm text-foreground truncate flex-1">
                  {displayName(profile ?? {})}
                </span>
                {id === currentUserId && (
                  <span className="text-[10px] font-bold uppercase text-primary">Tú</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground italic">
            Nadie eligió este equipo en esta ronda.
          </p>
        )}
      </div>
    </div>
  );
}

/** Modal: los equipos y el % de la polla que dijo que llegaban a cada fase. */
function StatsModal({
  bracket,
  teamsByCode,
  totalParticipants,
  onClose,
  onPickTeam,
}: {
  bracket: PredictionBracketEntry[];
  teamsByCode: Map<string, Team>;
  totalParticipants: number;
  onClose: () => void;
  onPickTeam: (round: PredictionBracketRound, code: string) => void;
}) {
  useBodyScrollLock(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Conteo por equipo y ronda; filas ordenadas por popularidad en R32.
  const rows = useMemo(() => {
    const byTeam = new Map<string, Record<PredictionBracketRound, number>>();
    for (const b of bracket) {
      let rec = byTeam.get(b.team_code);
      if (!rec) {
        rec = { r32: 0, r16: 0, qf: 0, sf: 0 };
        byTeam.set(b.team_code, rec);
      }
      rec[b.round] += 1;
    }
    return Array.from(byTeam.entries())
      .map(([code, counts]) => ({ team: teamsByCode.get(code), counts }))
      .filter((r): r is { team: Team; counts: Record<PredictionBracketRound, number> } => !!r.team)
      .sort((a, b) => b.counts.r32 - a.counts.r32 || a.team.name.localeCompare(b.team.name));
  }, [bracket, teamsByCode]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-8">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <BarChart3 className="h-4 w-4 text-tertiary" />
            Estadísticas del bracket
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            % de la polla que predijo que cada equipo llegaría a esa ronda. Toca una celda para ver
            quiénes.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] text-muted-foreground">
                <th className="text-left font-medium py-2 pr-2">Equipo</th>
                {BRACKET_ROUNDS.map((round) => (
                  <th
                    key={round}
                    title={BRACKET_ROUND_LABEL[round]}
                    className="text-center font-medium px-1 py-2 w-12"
                  >
                    {ROUND_SHORT[round]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ team, counts }) => (
                <tr key={team.code} className="border-b border-border/50 last:border-b-0">
                  <td className="py-1.5 pr-2">
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span
                        className={cn(`fi fi-${team.flag} rounded-sm flex-shrink-0`, 'shadow-[0_0_0_1px_hsl(var(--border))]')}
                        style={{ width: 20, height: 15 }}
                        aria-hidden="true"
                      />
                      <span className="text-[13px] text-foreground truncate">{team.name}</span>
                    </span>
                  </td>
                  {BRACKET_ROUNDS.map((round) => {
                    const c = counts[round];
                    const pct = pctOf(c, totalParticipants);
                    return (
                      <td key={round} className="px-1 py-1.5 text-center">
                        {c > 0 ? (
                          <button
                            type="button"
                            onClick={() => onPickTeam(round, team.code)}
                            title={`${c} ${c === 1 ? 'persona' : 'personas'} · ${BRACKET_ROUND_LABEL[round]}`}
                            className="relative inline-flex w-full items-center justify-center rounded px-1 py-1 text-[12px] font-semibold tabular-nums text-foreground hover:bg-tertiary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary overflow-hidden"
                          >
                            <span
                              className="absolute inset-y-0 left-0 bg-tertiary/15"
                              style={{ width: `${pct}%` }}
                              aria-hidden="true"
                            />
                            <span className="relative">{pct}%</span>
                          </button>
                        ) : (
                          <span className="text-[12px] text-muted-foreground/50">–</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Avatar({ profile, size }: { profile: PublicProfile | undefined; size: number }) {
  if (!profile?.avatar_url) {
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
