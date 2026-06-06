import { Crown, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRACKET_ROUND_LABEL, type PredictionBracketRound } from '@/lib/types/prediction';
import type { Team } from '@/lib/types/match';
import type { Prediction, PredictionBracketEntry } from '@/lib/types/prediction';

interface BracketFunnelProps {
  prediction: Prediction | null;
  bracket: PredictionBracketEntry[];
  teams: Team[];
}

/**
 * Embudo HORIZONTAL del bracket del usuario: una columna por fase que se
 * angosta — Eliminatorias de 32 (32) → Octavos (16) → Cuartos (8) →
 * Semifinales (4) → Final (2) → Campeón (1). Cada columna: título arriba +
 * recuadro verde claro (`bg-primary/10`, el verde de marca) con la lista de
 * equipos como **bandera + código** (MEX, RSA…) para ahorrar espacio. Scroll
 * horizontal si no caben. No son llaves por partido (el modelo es "quién pasa
 * a cada ronda", no cruces emparejados). 3er lugar + marcador final + goleador
 * van en la línea-resumen de abajo.
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

  // Una columna por fase (de la más ancha a la más angosta).
  const columns: Array<{ key: string; label: string; teams: Team[]; isChampion?: boolean }> = [
    { key: 'r32', label: BRACKET_ROUND_LABEL.r32, teams: teamsInRound('r32') },
    { key: 'r16', label: BRACKET_ROUND_LABEL.r16, teams: teamsInRound('r16') },
    { key: 'qf', label: BRACKET_ROUND_LABEL.qf, teams: teamsInRound('qf') },
    { key: 'sf', label: BRACKET_ROUND_LABEL.sf, teams: teamsInRound('sf') },
    {
      key: 'final',
      label: 'Final',
      teams: [championTeam, runnerUpTeam].filter((t): t is Team => !!t),
    },
    { key: 'champion', label: 'Campeón', teams: championTeam ? [championTeam] : [], isChampion: true },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Camino al título
      </h2>

      {/* Embudo horizontal (scroll en X si no caben las fases). */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex items-start gap-2.5 min-w-max">
          {columns.map((col) => (
            <div key={col.key} className="flex flex-col items-center gap-1.5">
              <span className="flex items-center gap-1 max-w-[88px] text-center text-[10px] font-semibold uppercase leading-tight tracking-wider text-muted-foreground">
                {col.isChampion && <Crown className="h-3 w-3 flex-shrink-0 text-amber-500" />}
                {col.label}
              </span>
              <div className="flex flex-col gap-1.5 rounded-lg bg-primary/10 p-2">
                {col.teams.length === 0 ? (
                  <span className="px-1.5 py-1 text-[11px] italic text-muted-foreground">—</span>
                ) : (
                  col.teams.map((t, j) => (
                    <TeamCodeChip
                      key={t.code}
                      team={t}
                      accent={col.isChampion || (col.key === 'final' && j === 0)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
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
        'inline-flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-xs font-semibold tabular-nums whitespace-nowrap',
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
