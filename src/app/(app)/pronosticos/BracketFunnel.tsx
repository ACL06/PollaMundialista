import { Fragment } from 'react';
import { Crown, Medal, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BRACKET_ROUNDS,
  BRACKET_ROUND_LABEL,
  BRACKET_ROUND_SIZE,
  type PredictionBracketRound,
} from '@/lib/types/prediction';
import type { Team } from '@/lib/types/match';
import type { Prediction, PredictionBracketEntry } from '@/lib/types/prediction';

interface BracketFunnelProps {
  prediction: Prediction | null;
  bracket: PredictionBracketEntry[];
  teams: Team[];
}

/**
 * Visualización tipo "embudo" del bracket del usuario: las rondas se angostan
 * de 32 → 16 → 8 → 4 → finalistas (2) → campeón (1), unidas por un conector de
 * UNA sola línea. No son llaves por partido: nuestro modelo es "qué equipos
 * cree que pasan a cada ronda", no cruces emparejados. Usa los tokens de la app.
 */
export function BracketFunnel({ prediction, bracket, teams }: BracketFunnelProps) {
  const teamsByCode = new Map(teams.map((t) => [t.code, t]));

  const teamsInRound = (round: PredictionBracketRound): Team[] =>
    bracket
      .filter((e) => e.round === round)
      .map((e) => teamsByCode.get(e.team_code))
      .filter((t): t is Team => !!t)
      .sort((a, b) => a.name.localeCompare(b.name));

  const championTeam = prediction?.champion_code ? teamsByCode.get(prediction.champion_code) ?? null : null;
  const runnerUpTeam = prediction?.runner_up_code ? teamsByCode.get(prediction.runner_up_code) ?? null : null;
  const thirdTeam = prediction?.third_place_code ? teamsByCode.get(prediction.third_place_code) ?? null : null;

  const finalScore =
    prediction?.final_home_score != null && prediction?.final_away_score != null
      ? `${prediction.final_home_score} – ${prediction.final_away_score}`
      : '—';

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Camino al título
      </h2>

      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 flex flex-col items-center">
        {BRACKET_ROUNDS.map((round, i) => {
          const inRound = teamsInRound(round);
          return (
            <Fragment key={round}>
              {i > 0 && <Connector />}
              <RoundBand
                label={BRACKET_ROUND_LABEL[round]}
                count={inRound.length}
                total={BRACKET_ROUND_SIZE[round]}
                teams={inRound}
                highlight={round === 'sf'}
              />
            </Fragment>
          );
        })}

        <Connector />

        {/* Final: los 2 finalistas (de los 4 semifinalistas salen estos 2). */}
        <div className="w-full flex flex-col items-center gap-2 rounded-lg bg-primary/5 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Final
          </span>
          <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-3">
            <PodiumSlot label="Campeón" Icon={Crown} iconClass="text-amber-500" team={championTeam} />
            <PodiumSlot label="Subcampeón" Icon={Trophy} iconClass="text-muted-foreground" team={runnerUpTeam} />
          </div>
        </div>

        <Connector />

        {/* Campeón */}
        <div className="flex flex-col items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
            <Trophy className="h-4 w-4" />
            Campeón
          </span>
          {championTeam ? (
            <span className="inline-flex items-center gap-2 rounded-lg border-2 border-amber-500/40 bg-amber-500/5 px-4 py-2 text-[15px] font-bold text-foreground">
              <Flag flag={championTeam.flag} size={26} />
              {championTeam.name}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
      </div>

      {/* Extras: 3.er lugar + marcador final + goleador */}
      <div className="rounded-lg border border-border bg-surface px-4 py-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
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

/** Conector vertical de una sola línea entre rondas (el "embudo"). */
function Connector() {
  return <div className="h-5 w-px bg-border" aria-hidden="true" />;
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

function TeamChip({ team }: { team: Team }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-[13px]">
      <Flag flag={team.flag} size={20} />
      <span className="text-foreground">{team.name}</span>
    </span>
  );
}

function RoundBand({
  label,
  count,
  total,
  teams,
  highlight,
}: {
  label: string;
  count: number;
  total: number;
  teams: Team[];
  highlight?: boolean;
}) {
  return (
    <div className={cn('w-full flex flex-col items-center gap-2 rounded-lg py-2', highlight && 'bg-primary/5')}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{' '}
        <span className="text-foreground tabular-nums normal-case">
          {count}/{total}
        </span>
      </span>
      {teams.length === 0 ? (
        <span className="text-xs text-muted-foreground italic">Sin selección</span>
      ) : (
        <div className="flex flex-wrap justify-center gap-1.5 max-w-2xl">
          {teams.map((t) => (
            <TeamChip key={t.code} team={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function PodiumSlot({
  label,
  Icon,
  iconClass,
  team,
}: {
  label: string;
  Icon: typeof Crown;
  iconClass: string;
  team: Team | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider', iconClass)}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      {team ? <TeamChip team={team} /> : <span className="text-sm text-muted-foreground">—</span>}
    </div>
  );
}
