'use client';

import { useMemo } from 'react';
import { AlertCircle, Crown, Info, Medal, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Team } from '@/lib/types/match';

type PodiumField = 'champion' | 'runnerUp' | 'third';

interface ClosingStepProps {
  teams: Team[];
  /** Códigos de los semifinalistas (bracket sf) — pool de campeón/sub/3er. */
  semifinalists: string[];
  champion: string | null;
  runnerUp: string | null;
  third: string | null;
  finalHome: string;
  finalAway: string;
  topScorer: string;
  error: string | null;
  onSelectPodium: (field: PodiumField, code: string) => void;
  onChangeFinalScore: (side: 'home' | 'away', value: string) => void;
  onBlurFinalScore: () => void;
  onChangeTopScorer: (value: string) => void;
  onBlurTopScorer: () => void;
  isLocked: boolean;
  isSubmitted: boolean;
}

export function ClosingStep({
  teams,
  semifinalists,
  champion,
  runnerUp,
  third,
  finalHome,
  finalAway,
  topScorer,
  error,
  onSelectPodium,
  onChangeFinalScore,
  onBlurFinalScore,
  onChangeTopScorer,
  onBlurTopScorer,
  isLocked,
  isSubmitted,
}: ClosingStepProps) {
  const readOnly = isLocked || isSubmitted;

  const teamsByCode = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.code, t);
    return map;
  }, [teams]);

  // Pools dependientes: subcampeón excluye al campeón; 3er excluye a ambos.
  const championPool = semifinalists;
  const runnerUpPool = semifinalists.filter((c) => c !== champion);
  const thirdPool = semifinalists.filter((c) => c !== champion && c !== runnerUp);

  const hasSemis = semifinalists.length > 0;

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Cierre</h2>
        <p className="text-sm text-muted-foreground">
          Define tu podio entre los semifinalistas que elegiste, más el marcador exacto de la
          final y el goleador del torneo.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!hasSemis ? (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Primero elige tus <span className="font-medium text-foreground">Semifinalistas</span>{' '}
            en el paso del bracket. El campeón, subcampeón y tercer lugar se eligen entre
            esos 4 equipos.
          </span>
        </div>
      ) : (
        <>
          <PodiumPicker
            label="Campeón"
            Icon={Crown}
            iconClass="text-amber-500"
            pool={championPool}
            selected={champion}
            teamsByCode={teamsByCode}
            readOnly={readOnly}
            onSelect={(code) => onSelectPodium('champion', code)}
          />
          <PodiumPicker
            label="Subcampeón"
            Icon={Trophy}
            iconClass="text-muted-foreground"
            pool={runnerUpPool}
            selected={runnerUp}
            teamsByCode={teamsByCode}
            readOnly={readOnly}
            onSelect={(code) => onSelectPodium('runnerUp', code)}
            emptyHint="Elige primero al campeón."
          />
          <PodiumPicker
            label="Tercer lugar"
            Icon={Medal}
            iconClass="text-amber-700"
            pool={thirdPool}
            selected={third}
            teamsByCode={teamsByCode}
            readOnly={readOnly}
            onSelect={(code) => onSelectPodium('third', code)}
            emptyHint="Elige primero campeón y subcampeón."
          />
        </>
      )}

      {/* Marcador exacto de la final (bonus) */}
      <div className="space-y-2 pt-2 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Marcador exacto de la final{' '}
          <span className="text-xs font-normal text-muted-foreground">(bonus)</span>
        </h3>
        <p className="text-xs text-muted-foreground">
          Los goles de tu campeón y tu subcampeón en los 90&apos; (sin prórroga ni penales).
          Suma solo si aciertas el marcador <span className="font-medium text-foreground">en
          el orden correcto</span>.
        </p>
        <div className="flex items-end gap-3">
          <FinalScoreSide
            label="Tu campeón"
            team={champion ? (teamsByCode.get(champion) ?? null) : null}
            value={finalHome}
            onChange={(v) => onChangeFinalScore('home', v)}
            onBlur={onBlurFinalScore}
            disabled={readOnly}
            ariaLabel="Goles de tu campeón en la final"
          />
          <span className="text-muted-foreground font-mono pb-2.5">–</span>
          <FinalScoreSide
            label="Tu subcampeón"
            team={runnerUp ? (teamsByCode.get(runnerUp) ?? null) : null}
            value={finalAway}
            onChange={(v) => onChangeFinalScore('away', v)}
            onBlur={onBlurFinalScore}
            disabled={readOnly}
            ariaLabel="Goles de tu subcampeón en la final"
          />
        </div>
      </div>

      {/* Goleador del torneo */}
      <div className="space-y-2 pt-2 border-t border-border">
        <label htmlFor="top_scorer" className="block text-sm font-semibold text-foreground">
          Goleador del torneo
        </label>
        <input
          id="top_scorer"
          type="text"
          value={topScorer}
          placeholder="ej: Kylian Mbappé"
          maxLength={80}
          disabled={readOnly}
          onChange={(e) => onChangeTopScorer(e.target.value)}
          onBlur={onBlurTopScorer}
          className={cn(
            'w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-tertiary focus:border-tertiary',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        />
        <p className="text-xs text-muted-foreground">
          Escribe el nombre del jugador. Se evalúa de forma flexible (sin distinguir
          mayúsculas ni acentos).
        </p>
      </div>
    </div>
  );
}

interface PodiumPickerProps {
  label: string;
  Icon: typeof Crown;
  iconClass: string;
  pool: string[];
  selected: string | null;
  teamsByCode: Map<string, Team>;
  readOnly: boolean;
  onSelect: (code: string) => void;
  emptyHint?: string;
}

function PodiumPicker({
  label,
  Icon,
  iconClass,
  pool,
  selected,
  teamsByCode,
  readOnly,
  onSelect,
  emptyHint,
}: PodiumPickerProps) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className={cn('h-4 w-4', iconClass)} />
        {label}
      </h3>
      {pool.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyHint ?? 'Sin opciones.'}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {pool.map((code) => {
            const team = teamsByCode.get(code);
            if (!team) return null;
            const isSelected = selected === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => onSelect(code)}
                disabled={readOnly}
                aria-pressed={isSelected}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-surface hover:border-foreground/20',
                  readOnly && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    `fi fi-${team.flag} rounded-sm flex-shrink-0`,
                    'shadow-[0_0_0_1px_hsl(var(--border))]',
                  )}
                  style={{ width: 22, height: 16 }}
                  aria-hidden="true"
                />
                <span className="text-[13px] font-medium text-foreground truncate">
                  {team.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FinalScoreSideProps {
  /** Texto cuando aún no hay equipo elegido ("Tu campeón" / "Tu subcampeón"). */
  label: string;
  /** Equipo elegido (campeón o subcampeón), o null si todavía no se eligió. */
  team: Team | null;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  disabled: boolean;
  ariaLabel: string;
}

/** Una columna del marcador de la final: bandera + nombre encima de la caja. */
function FinalScoreSide({
  label,
  team,
  value,
  onChange,
  onBlur,
  disabled,
  ariaLabel,
}: FinalScoreSideProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground max-w-[110px]">
        {team ? (
          <>
            <span
              className={cn(
                `fi fi-${team.flag} rounded-sm flex-shrink-0`,
                'shadow-[0_0_0_1px_hsl(var(--border))]',
              )}
              style={{ width: 18, height: 13 }}
              aria-hidden="true"
            />
            <span className="truncate text-foreground">{team.name}</span>
          </>
        ) : (
          <span className="italic">{label}</span>
        )}
      </span>
      <ScoreBox
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        ariaLabel={ariaLabel}
      />
    </div>
  );
}

interface ScoreBoxProps {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  disabled: boolean;
  ariaLabel: string;
}

function ScoreBox({ value, onChange, onBlur, disabled, ariaLabel }: ScoreBoxProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      maxLength={2}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      aria-label={ariaLabel}
      className={cn(
        'w-12 h-10 text-center font-mono font-bold text-[18px] tabular-nums',
        'bg-background border border-border rounded-md',
        'focus:outline-none focus:ring-2 focus:ring-tertiary focus:border-tertiary',
        'disabled:opacity-60 disabled:cursor-not-allowed',
      )}
    />
  );
}
