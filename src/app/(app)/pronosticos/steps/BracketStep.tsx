'use client';

import { useMemo } from 'react';
import { AlertCircle, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BRACKET_ROUNDS,
  BRACKET_ROUND_LABEL,
  BRACKET_ROUND_SIZE,
  previousRound,
  type PredictionBracketRound,
} from '@/lib/types/prediction';
import type { Team } from '@/lib/types/match';

interface BracketStepProps {
  /** Los 48 equipos con su group_code. */
  teams: Team[];
  /** Selección actual por ronda (round → set de team_codes). */
  bracket: Map<PredictionBracketRound, Set<string>>;
  activeRound: PredictionBracketRound;
  onSelectRound: (round: PredictionBracketRound) => void;
  onToggle: (round: PredictionBracketRound, teamCode: string) => void;
  error: string | null;
  isLocked: boolean;
  isSubmitted: boolean;
}

export function BracketStep({
  teams,
  bracket,
  activeRound,
  onSelectRound,
  onToggle,
  error,
  isLocked,
  isSubmitted,
}: BracketStepProps) {
  const readOnly = isLocked || isSubmitted;

  const teamsByCode = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.code, t);
    return map;
  }, [teams]);

  // El pool de la ronda activa: en r32 son los 48; en las demás, los
  // equipos seleccionados en la ronda anterior.
  const prev = previousRound(activeRound);
  const poolCodes = useMemo(() => {
    if (!prev) return teams.map((t) => t.code);
    return Array.from(bracket.get(prev) ?? []);
  }, [prev, teams, bracket]);

  const selectedSet = bracket.get(activeRound) ?? new Set<string>();
  const target = BRACKET_ROUND_SIZE[activeRound];
  const atCap = selectedSet.size >= target;

  // Agrupar el pool por grupo (A-L). Solo mostramos grupos con ≥1 equipo.
  const groupedPool = useMemo(() => {
    const groups = new Map<string, Team[]>();
    for (const code of poolCodes) {
      const team = teamsByCode.get(code);
      if (!team) continue;
      const g = team.group_code ?? '?';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(team);
    }
    // Orden alfabético por grupo y por nombre dentro del grupo
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, list]) => ({
        group,
        teams: list.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [poolCodes, teamsByCode]);

  const countColor =
    selectedSet.size === target
      ? 'text-primary'
      : selectedSet.size > target
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Bracket eliminatorio</h2>
        <p className="text-sm text-muted-foreground">
          Marca qué equipos crees que clasifican a cada ronda. Cada ronda se elige entre los
          que pusiste en la anterior.
        </p>
      </div>

      {/* Sub-tabs por ronda */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist">
        {BRACKET_ROUNDS.map((round) => {
          const isActive = round === activeRound;
          const size = bracket.get(round)?.size ?? 0;
          const full = size === BRACKET_ROUND_SIZE[round];
          return (
            <button
              key={round}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectRound(round)}
              className={cn(
                'flex-shrink-0 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {BRACKET_ROUND_LABEL[round]}
              <span
                className={cn(
                  'ml-1.5 tabular-nums',
                  isActive ? 'opacity-90' : full ? 'text-primary' : 'opacity-70',
                )}
              >
                {size}/{BRACKET_ROUND_SIZE[round]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Contador de la ronda activa */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Selecciona <span className="font-medium text-foreground">{target}</span> equipos
          para {BRACKET_ROUND_LABEL[activeRound]}.
        </p>
        <span className={cn('text-sm font-bold tabular-nums', countColor)}>
          {selectedSet.size}/{target}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Pool vacío (no hay nada en la ronda anterior) */}
      {poolCodes.length === 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Primero selecciona equipos en{' '}
            <span className="font-medium text-foreground">
              {prev ? BRACKET_ROUND_LABEL[prev] : ''}
            </span>{' '}
            para poder elegir aquí.
          </span>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedPool.map(({ group, teams: groupTeams }) => (
            <div key={group} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Grupo {group}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {groupTeams.map((team) => {
                  const selected = selectedSet.has(team.code);
                  const disabled = readOnly || (atCap && !selected);
                  return (
                    <button
                      key={team.code}
                      type="button"
                      onClick={() => onToggle(activeRound, team.code)}
                      disabled={disabled}
                      aria-pressed={selected}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
                        selected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-surface hover:border-foreground/20',
                        disabled && !selected && 'opacity-40 cursor-not-allowed',
                        readOnly && 'cursor-default',
                      )}
                    >
                      <span
                        className={cn(
                          `fi fi-${team.flag} rounded-sm flex-shrink-0`,
                          'shadow-[0_0_0_1px_hsl(var(--border))]',
                        )}
                        style={{ width: 24, height: 18 }}
                        aria-hidden="true"
                      />
                      <span className="text-[14px] font-medium text-foreground truncate flex-1">
                        {team.name}
                      </span>
                      <span
                        className={cn(
                          'flex items-center justify-center h-5 w-5 rounded-full flex-shrink-0 border',
                          selected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border',
                        )}
                      >
                        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
