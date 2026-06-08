'use client';

import { useMemo } from 'react';
import { AlertCircle, ArrowRight, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCenterActiveTab } from '@/lib/use-center-active-tab';
import {
  BRACKET_ROUNDS,
  BRACKET_ROUND_LABEL,
  BRACKET_ROUND_SIZE,
  BRACKET_R32_GROUP_MAX,
  BRACKET_R32_GROUP_MIN,
  BRACKET_R32_MAX_THIRDS,
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
  /** Lleva al paso Cierre (Paso 4). Para el enlace del aviso de semifinalistas. */
  onGoToClosing: () => void;
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
  onGoToClosing,
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

  const selectedSet = useMemo(
    () => bracket.get(activeRound) ?? new Set<string>(),
    [bracket, activeRound],
  );
  const target = BRACKET_ROUND_SIZE[activeRound];
  const atCap = selectedSet.size >= target;
  // La regla "2 a 3 por grupo" solo aplica a Eliminatorias de 32.
  const isR32 = activeRound === 'r32';
  const isSf = activeRound === 'sf';

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

  // #10: de Octavos en adelante (ya no es fase de grupos) los equipos van en
  // una sola lista ordenada alfabéticamente, sin agrupar por grupo.
  const flatPool = useMemo(
    () =>
      poolCodes
        .map((code) => teamsByCode.get(code))
        .filter((t): t is Team => !!t)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [poolCodes, teamsByCode],
  );

  // #11: centrar la ronda activa en el selector scrolleable.
  const { containerRef: roundTabsRef, activeRef: activeRoundRef } =
    useCenterActiveTab<HTMLButtonElement>(activeRound);

  // Resumen de la regla de Eliminatorias de 32: cuántos grupos llegaron a 3
  // (tope 8 = los 8 mejores terceros) y cuáles aún no alcanzan el mínimo
  // de 2. `canAddThird` bloquea el 9.º tercero en la UI.
  const r32Summary = useMemo(() => {
    if (!isR32) {
      return { groupsWithThree: 0, canAddThird: true, incompleteGroups: [] as string[] };
    }
    let groupsWithThree = 0;
    const incompleteGroups: string[] = [];
    for (const { group, teams: groupTeams } of groupedPool) {
      const count = groupTeams.filter((t) => selectedSet.has(t.code)).length;
      if (count >= BRACKET_R32_GROUP_MAX) groupsWithThree += 1;
      if (count < BRACKET_R32_GROUP_MIN) incompleteGroups.push(group);
    }
    return {
      groupsWithThree,
      canAddThird: groupsWithThree < BRACKET_R32_MAX_THIRDS,
      incompleteGroups,
    };
  }, [isR32, groupedPool, selectedSet]);

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
          Marca tu pronóstico de los equipos que crees que clasifican en cada ronda. Cada ronda se
          elige entre los que pusiste en la anterior.
        </p>
      </div>

      {/* Sub-tabs por ronda */}
      <div
        ref={roundTabsRef}
        className="flex gap-1.5 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain scroll-smooth pb-1 -mx-1 px-1"
        role="tablist"
      >
        {BRACKET_ROUNDS.map((round) => {
          const isActive = round === activeRound;
          const size = bracket.get(round)?.size ?? 0;
          const full = size === BRACKET_ROUND_SIZE[round];
          return (
            <button
              key={round}
              ref={isActive ? activeRoundRef : undefined}
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

      {/* Regla 2-3 por grupo (solo Eliminatorias de 32) */}
      {isR32 && (
        <p className="text-xs text-muted-foreground -mt-3">
          Mínimo {BRACKET_R32_GROUP_MIN} por grupo. Hasta {BRACKET_R32_GROUP_MAX} en máximo{' '}
          {BRACKET_R32_MAX_THIRDS} grupos (los 8 mejores terceros).{' '}
          <span
            className={cn(
              'font-medium tabular-nums',
              r32Summary.canAddThird ? 'text-foreground' : 'text-amber-500',
            )}
          >
            Terceros: {r32Summary.groupsWithThree}/{BRACKET_R32_MAX_THIRDS}
          </span>
        </p>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* #12: en Semifinales, una vez elegidos los 4, guiar al paso Cierre. */}
      {isSf && selectedSet.size === target && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
          <ArrowRight className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
          <span>
            ¡Listo! Ya tienes tus 4 semifinalistas. Continúa al paso{' '}
            <button
              type="button"
              onClick={onGoToClosing}
              className="rounded font-semibold text-tertiary underline underline-offset-2 hover:text-tertiary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
            >
              Cierre
            </button>{' '}
            para elegir campeón, subcampeón, tercer lugar y el marcador de la final.
          </span>
        </div>
      )}

      {/* Error de mínimo por grupo: cada grupo necesita ≥2 en Eliminatorias de 32.
          Solo se muestra una vez el usuario empezó a seleccionar. */}
      {isR32 && selectedSet.size > 0 && r32Summary.incompleteGroups.length > 0 && (
        <div className="flex items-start gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Cada grupo necesita mínimo {BRACKET_R32_GROUP_MIN} equipos. Te falta(n):{' '}
            <span className="font-semibold">{r32Summary.incompleteGroups.join(', ')}</span>.
          </span>
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
      ) : isR32 ? (
        <div className="space-y-5">
          {groupedPool.map(({ group, teams: groupTeams }) => {
            const groupSelected = groupTeams.filter((t) => selectedSet.has(t.code)).length;
            const groupAtMax = isR32 && groupSelected >= BRACKET_R32_GROUP_MAX;
            // En r32 el grupo está "ok" con 2-3; incompleto (error) con 0-1.
            const groupOk = groupSelected >= BRACKET_R32_GROUP_MIN;
            // No se puede agregar un 3.º si ya hay 8 grupos con 3 (tope de
            // terceros). Este grupo, con 2, no puede pasar a 3.
            const thirdBlocked =
              isR32 &&
              groupSelected === BRACKET_R32_GROUP_MIN &&
              !r32Summary.canAddThird;
            const cannotAdd = groupAtMax || thirdBlocked;
            return (
            <div key={group} className="space-y-2">
              <h3 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Grupo {group}
                {isR32 && (
                  <span
                    className={cn(
                      'tabular-nums normal-case font-bold',
                      groupOk ? 'text-primary' : 'text-destructive',
                    )}
                  >
                    {groupSelected}/{BRACKET_R32_GROUP_MAX}
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {groupTeams.map((team) => {
                  const selected = selectedSet.has(team.code);
                  const disabled = readOnly || (atCap && !selected) || (cannotAdd && !selected);
                  return (
                    <TeamOption
                      key={team.code}
                      team={team}
                      selected={selected}
                      disabled={disabled}
                      readOnly={readOnly}
                      onToggle={() => onToggle(activeRound, team.code)}
                    />
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        // De Octavos en adelante: lista única, orden alfabético (#10).
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {flatPool.map((team) => {
            const selected = selectedSet.has(team.code);
            const disabled = readOnly || (atCap && !selected);
            return (
              <TeamOption
                key={team.code}
                team={team}
                selected={selected}
                disabled={disabled}
                readOnly={readOnly}
                onToggle={() => onToggle(activeRound, team.code)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TeamOptionProps {
  team: Team;
  selected: boolean;
  disabled: boolean;
  readOnly: boolean;
  onToggle: () => void;
}

/** Botón de selección de un equipo (reutilizado en grupos y lista plana). */
function TeamOption({ team, selected, disabled, readOnly, onToggle }: TeamOptionProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
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
      <span className="text-[14px] font-medium text-foreground truncate flex-1">{team.name}</span>
      <span
        className={cn(
          'flex items-center justify-center h-5 w-5 rounded-full flex-shrink-0 border',
          selected ? 'bg-primary border-primary text-primary-foreground' : 'border-border',
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  );
}
