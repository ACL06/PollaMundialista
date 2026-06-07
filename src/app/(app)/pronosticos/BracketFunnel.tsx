'use client';

import { useState } from 'react';
import { ChevronDown, Crown, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRACKET_ROUND_LABEL, type PredictionBracketRound } from '@/lib/types/prediction';
import type { Team } from '@/lib/types/match';
import type { Prediction, PredictionBracketEntry } from '@/lib/types/prediction';

interface BracketFunnelProps {
  prediction: Prediction | null;
  bracket: PredictionBracketEntry[];
  teams: Team[];
}

interface Phase {
  key: string;
  label: string;
  total: number;
  teams: Team[];
  isChampion?: boolean;
}

const PHASE_KEYS = ['r32', 'r16', 'qf', 'sf', 'final', 'champion'];

/**
 * Embudo del bracket del usuario como **acordeón por fase**: Eliminatorias de
 * 32 → Octavos → Cuartos → Semifinales → Final → Campeón. Cada fase es una
 * sección colapsable (cabecera verde claro `bg-primary/10`, el verde de marca)
 * cuyo cuerpo lista los equipos como **bandera + código** (MEX, RSA…) en una
 * cuadrícula centrada (≈4 por fila en móvil, envuelve a la 2.ª fila si hay
 * más). No son llaves por partido (el modelo es "quién pasa", no cruces).
 * 3er lugar + marcador final + goleador van en la línea-resumen de abajo.
 */
export function BracketFunnel({ prediction, bracket, teams }: BracketFunnelProps) {
  const teamsByCode = new Map(teams.map((t) => [t.code, t]));

  const teamsInRound = (round: PredictionBracketRound): Team[] =>
    bracket
      .filter((e) => e.round === round)
      .map((e) => teamsByCode.get(e.team_code))
      .filter((t): t is Team => !!t)
      .sort((a, b) => a.code.localeCompare(b.code));

  const championTeam = prediction?.champion_code ? teamsByCode.get(prediction.champion_code) ?? null : null;
  const runnerUpTeam = prediction?.runner_up_code ? teamsByCode.get(prediction.runner_up_code) ?? null : null;
  const thirdTeam = prediction?.third_place_code ? teamsByCode.get(prediction.third_place_code) ?? null : null;

  const finalScore =
    prediction?.final_home_score != null && prediction?.final_away_score != null
      ? `${prediction.final_home_score} – ${prediction.final_away_score}`
      : '—';

  const phases: Phase[] = [
    { key: 'r32', label: BRACKET_ROUND_LABEL.r32, total: 32, teams: teamsInRound('r32') },
    { key: 'r16', label: BRACKET_ROUND_LABEL.r16, total: 16, teams: teamsInRound('r16') },
    { key: 'qf', label: BRACKET_ROUND_LABEL.qf, total: 8, teams: teamsInRound('qf') },
    { key: 'sf', label: BRACKET_ROUND_LABEL.sf, total: 4, teams: teamsInRound('sf') },
    {
      key: 'final',
      label: 'Final',
      total: 2,
      teams: [championTeam, runnerUpTeam].filter((t): t is Team => !!t),
    },
    { key: 'champion', label: 'Campeón', total: 1, teams: championTeam ? [championTeam] : [], isChampion: true },
  ];

  // Acordeón multi-abierto: por defecto todas las fases expandidas.
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set(PHASE_KEYS));
  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Camino al título
      </h2>

      <div className="space-y-2">
        {phases.map((phase) => {
          const open = openKeys.has(phase.key);
          return (
            <div key={phase.key} className="overflow-hidden rounded-lg border border-border">
              {/* Cabecera verde claro, clickeable (acordeón) */}
              <button
                type="button"
                onClick={() => toggle(phase.key)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-2 bg-primary/10 px-3 py-2.5 transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tertiary"
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  {phase.isChampion && <Crown className="h-4 w-4 flex-shrink-0 text-amber-500" />}
                  {phase.label}
                  <span className="text-xs font-normal tabular-nums text-muted-foreground">
                    {phase.teams.length}/{phase.total}
                  </span>
                </span>
                <ChevronDown
                  className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
                />
              </button>

              {/* Cuerpo: cuadrícula centrada de chips (≈4 por fila, envuelve) */}
              {open && (
                <div className="flex flex-wrap justify-center gap-2 bg-surface p-3">
                  {phase.teams.length === 0 ? (
                    <span className="text-[13px] italic text-muted-foreground">Sin selección</span>
                  ) : (
                    phase.teams.map((t, j) => (
                      <TeamCodeChip
                        key={t.code}
                        team={t}
                        accent={phase.isChampion || (phase.key === 'final' && j === 0)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Extras: 3.er lugar + marcador final + goleador */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <Medal className="h-4 w-4 text-amber-700" />
          3.<sup>er</sup>&nbsp;lugar:&nbsp;
          <span className="font-medium">{thirdTeam ? thirdTeam.name : '—'}</span>
        </span>
        <span className="text-muted-foreground" aria-hidden="true">·</span>
        <span className="text-foreground">
          Marcador final:&nbsp;
          <span className="font-mono font-bold tabular-nums">{finalScore}</span>
        </span>
        <span className="text-muted-foreground" aria-hidden="true">·</span>
        <span className="text-foreground">
          Goleador:&nbsp;
          <span className="font-medium">{prediction?.top_scorer?.trim() || '—'}</span>
        </span>
      </div>
    </section>
  );
}

function Flag({ flag, size }: { flag: string; size: number }) {
  return (
    <span
      className={cn(`fi fi-${flag} rounded-sm flex-shrink-0`, 'shadow-[0_0_0_1px_hsl(var(--border))]')}
      style={{ width: size, height: Math.round((size * 3) / 4) }}
      aria-hidden="true"
    />
  );
}

/** Chip compacto: bandera + código de país (MEX, RSA…). */
function TeamCodeChip({ team, accent }: { team: Team; accent?: boolean }) {
  return (
    <span
      title={team.name}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold whitespace-nowrap',
        accent
          ? 'border-amber-500/50 bg-amber-500/10 text-foreground'
          : 'border-border bg-surface text-foreground',
      )}
    >
      <Flag flag={team.flag} size={18} />
      {team.code}
    </span>
  );
}
