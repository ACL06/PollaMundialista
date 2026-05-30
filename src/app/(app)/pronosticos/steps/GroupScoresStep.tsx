'use client';

import { useEffect, useMemo, useRef } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamLabel } from '@/components/calendar/TeamLabel';
import { BracketSlot } from '@/components/calendar/BracketSlot';
import {
  formatMatchDateKey,
  formatMatchDateLong,
  formatMatchTime,
} from '@/lib/format-date';
import type { Match } from '@/lib/types/match';

/** Valor en edición de un marcador. Strings para tolerar entrada parcial. */
export interface GroupScoreDraft {
  home: string;
  away: string;
}

interface GroupScoresStepProps {
  matches: Match[];
  draft: Map<string, GroupScoreDraft>;
  savedIds: Set<string>;
  errors: Map<string, string>;
  selectedDayKey: string;
  onSelectDay: (key: string) => void;
  onChangeField: (matchId: string, side: 'home' | 'away', value: string) => void;
  onBlurField: (matchId: string) => void;
  isLocked: boolean;
  isSubmitted: boolean;
}

/**
 * Step 2 del wizard. Componente "dumb": no tiene state propio salvo el
 * `useMemo` para agrupar los matches por día. Todo el state (draft,
 * savedIds, errores, día seleccionado) vive en el `PredictionWizard`
 * para que persista cuando el usuario navega entre steps.
 */
export function GroupScoresStep({
  matches,
  draft,
  savedIds,
  errors,
  selectedDayKey,
  onSelectDay,
  onChangeField,
  onBlurField,
  isLocked,
  isSubmitted,
}: GroupScoresStepProps) {
  const readOnly = isLocked || isSubmitted;

  // Agrupar partidos por día (ya vienen ordenados por kicks_off_at).
  const days = useMemo(() => {
    const grouped = new Map<string, { label: string; matches: Match[] }>();
    for (const m of matches) {
      const date = new Date(m.kicks_off_at);
      const key = formatMatchDateKey(date);
      if (!grouped.has(key)) {
        grouped.set(key, { label: formatMatchDateLong(date), matches: [] });
      }
      grouped.get(key)!.matches.push(m);
    }
    return Array.from(grouped.entries()).map(([key, value]) => ({ key, ...value }));
  }, [matches]);

  const completedCount = savedIds.size;
  const selectedDay = days.find((d) => d.key === selectedDayKey) ?? days[0];

  // Mantener el tab del día seleccionado centrado en el scroll horizontal.
  // Se calcula el offset del tab DENTRO del contenedor con rects (no
  // `offsetLeft`, que es relativo al offsetParent y se iba hasta el final).
  // Scroll controlado del contenedor para no mover el scroll de la página.
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const container = tabsRef.current;
    const active = activeTabRef.current;
    if (!container || !active) return;
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    // Posición del tab dentro del contenido scrolleable del contenedor.
    const offsetWithin = activeRect.left - containerRect.left + container.scrollLeft;
    const target = offsetWithin - (container.clientWidth - active.clientWidth) / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [selectedDay?.key]);

  return (
    <div className="space-y-6">
      {/* Header con progreso */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Marcadores de fase de grupos</h2>
        <p className="text-sm text-muted-foreground">
          Predice el marcador exacto de cada partido. Se guarda automáticamente cuando llenas
          los dos lados.{' '}
          <span className="font-medium text-foreground">
            {completedCount} / {matches.length} pronosticados
          </span>
          .
        </p>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(completedCount / matches.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Tabs por día */}
      <div
        ref={tabsRef}
        className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scroll-smooth"
        role="tablist"
        aria-label="Días con partidos"
      >
        {days.map((day) => {
          const isActive = day.key === selectedDay?.key;
          // Contar partidos del día con marcador efectivamente guardado.
          const filled = day.matches.filter((m) => savedIds.has(m.id)).length;
          return (
            <button
              key={day.key}
              ref={isActive ? activeTabRef : undefined}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectDay(day.key)}
              className={cn(
                'flex-shrink-0 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="tabular-nums">
                {new Date(day.key).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'America/Bogota',
                })}
              </span>
              <span className="ml-1.5 opacity-70 tabular-nums">
                {filled}/{day.matches.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Partidos del día seleccionado */}
      {selectedDay && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {selectedDay.label}
          </h3>
          <div className="flex flex-col gap-2.5">
            {selectedDay.matches.map((match) => (
              <MatchScoreCard
                key={match.id}
                match={match}
                draft={draft.get(match.id) ?? { home: '', away: '' }}
                isSaved={savedIds.has(match.id)}
                readOnly={readOnly}
                errorMessage={errors.get(match.id) ?? null}
                onChange={(side, value) => onChangeField(match.id, side, value)}
                onBlur={() => onBlurField(match.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MatchScoreCardProps {
  match: Match;
  draft: GroupScoreDraft;
  /** True solo si los valores actuales fueron persistidos exitosamente en BD. */
  isSaved: boolean;
  readOnly: boolean;
  /** Mensaje de error específico de este partido. Null si no hay error. */
  errorMessage: string | null;
  onChange: (side: 'home' | 'away', value: string) => void;
  onBlur: () => void;
}

function MatchScoreCard({
  match,
  draft,
  isSaved,
  readOnly,
  errorMessage,
  onChange,
  onBlur,
}: MatchScoreCardProps) {
  const kicksOffAt = new Date(match.kicks_off_at);
  const hasError = errorMessage !== null;
  // Incompleto = exactamente un lado tiene valor (XOR). No es error, solo
  // falta el otro marcador para poder guardar.
  const homeFilled = draft.home !== '';
  const awayFilled = draft.away !== '';
  const isPartial = !hasError && homeFilled !== awayFilled;

  return (
    <article
      className={cn(
        'border rounded-lg px-[18px] py-[14px] grid grid-cols-1 sm:grid-cols-[110px_minmax(0,1fr)] gap-y-2 sm:gap-x-[18px] font-sans transition-colors',
        hasError && 'border-destructive bg-destructive/5',
        !hasError && isPartial && 'border-amber-500 bg-amber-500/5',
        !hasError && !isPartial && isSaved && 'border-primary/40 bg-primary/[0.03]',
        !hasError && !isPartial && !isSaved && 'border-border bg-surface',
      )}
    >
      {/* Hora + estado */}
      <div className="flex flex-row sm:flex-col gap-3 sm:gap-1.5 items-center sm:items-start justify-between sm:justify-start">
        <span className="text-[18px] font-semibold text-foreground leading-none">
          {formatMatchTime(kicksOffAt)}
        </span>
        {isSaved ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <CheckCircle2 className="h-3 w-3" />
            Guardado
          </span>
        ) : isPartial ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-amber-500">
            <AlertCircle className="h-3 w-3" />
            Falta un lado
          </span>
        ) : null}
      </div>

      {/* Equipos + inputs */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-center">
        {match.home_team ? (
          <TeamLabel team={match.home_team} align="right" />
        ) : (
          <BracketSlot source={match.bracket_source_home} align="right" />
        )}
        <div className="flex items-center gap-1.5">
          <ScoreInput
            value={draft.home}
            onChange={(v) => onChange('home', v)}
            onBlur={onBlur}
            disabled={readOnly}
            aria-label={`Marcador local de ${match.home_team?.name ?? 'equipo local'}`}
          />
          <span className="text-muted-foreground font-mono">–</span>
          <ScoreInput
            value={draft.away}
            onChange={(v) => onChange('away', v)}
            onBlur={onBlur}
            disabled={readOnly}
            aria-label={`Marcador visitante de ${match.away_team?.name ?? 'equipo visitante'}`}
          />
        </div>
        {match.away_team ? (
          <TeamLabel team={match.away_team} align="left" />
        ) : (
          <BracketSlot source={match.bracket_source_away} align="left" />
        )}
      </div>

      {/* Mensaje de error específico de este partido. */}
      {hasError && (
        <div
          className="col-span-full flex items-center gap-1.5 text-[12px] text-destructive"
          role="alert"
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Footer */}
      <div className="col-span-full flex items-center justify-between gap-3 pt-1.5 border-t border-dashed border-border">
        <span className="text-[12px] text-muted-foreground truncate">{match.venue}</span>
        {match.group_code && (
          <span className="text-[12px] text-muted-foreground whitespace-nowrap">
            Grupo {match.group_code}
          </span>
        )}
      </div>
    </article>
  );
}

interface ScoreInputProps {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  disabled: boolean;
  'aria-label': string;
}

function ScoreInput({ value, onChange, onBlur, disabled, ...rest }: ScoreInputProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      placeholder="0"
      maxLength={2}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className={cn(
        'w-10 h-9 text-center font-mono font-bold text-[18px] tabular-nums',
        'bg-background border border-border rounded-md',
        'focus:outline-none focus:ring-2 focus:ring-tertiary focus:border-tertiary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
      aria-label={rest['aria-label']}
    />
  );
}
