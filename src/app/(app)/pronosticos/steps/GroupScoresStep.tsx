'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamLabel } from '@/components/calendar/TeamLabel';
import { BracketSlot } from '@/components/calendar/BracketSlot';
import {
  formatMatchDateKey,
  formatMatchDateLong,
  formatMatchTime,
} from '@/lib/format-date';
import { saveGroupScore } from '../actions';
import type { Match } from '@/lib/types/match';
import type { PredictionGroupScore } from '@/lib/types/prediction';

interface GroupScoresStepProps {
  matches: Match[];
  initialScores: PredictionGroupScore[];
  isLocked: boolean;
  isSubmitted: boolean;
}

/** Estado local de un marcador en edición. */
interface DraftScore {
  home: string;
  away: string;
}

/** Filtra al tipear: solo dígitos, máximo 2 caracteres. */
function sanitizeScore(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2);
}

function buildInitialDraft(scores: PredictionGroupScore[]): Map<string, DraftScore> {
  const map = new Map<string, DraftScore>();
  for (const s of scores) {
    map.set(s.match_id, { home: String(s.home_score), away: String(s.away_score) });
  }
  return map;
}

/**
 * Step 2 del wizard. 72 marcadores predichos agrupados por día.
 * Autosave en `onBlur` de cada input: si los dos lados tienen valor
 * válido (0-30), se persiste en `prediction_group_scores`.
 */
export function GroupScoresStep({
  matches,
  initialScores,
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

  const [selectedDayKey, setSelectedDayKey] = useState(() => days[0]?.key ?? '');
  const [draft, setDraft] = useState<Map<string, DraftScore>>(() =>
    buildInitialDraft(initialScores),
  );
  const [errorMatchId, setErrorMatchId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Cuántos partidos tienen un marcador completo y válido guardado.
  const completedCount = useMemo(() => {
    let n = 0;
    for (const s of initialScores) {
      if (
        typeof s.home_score === 'number' &&
        typeof s.away_score === 'number' &&
        s.home_score >= 0 &&
        s.away_score >= 0
      ) {
        n += 1;
      }
    }
    return n;
  }, [initialScores]);

  const selectedDay = days.find((d) => d.key === selectedDayKey);

  const updateField = (matchId: string, side: 'home' | 'away', rawValue: string) => {
    const cleaned = sanitizeScore(rawValue);
    setDraft((prev) => {
      const next = new Map(prev);
      const current = next.get(matchId) ?? { home: '', away: '' };
      next.set(matchId, { ...current, [side]: cleaned });
      return next;
    });
    if (errorMatchId === matchId) {
      setErrorMatchId(null);
      setErrorMessage(null);
    }
  };

  const persistIfReady = (matchId: string) => {
    if (readOnly) return;
    const current = draft.get(matchId);
    if (!current) return;
    if (current.home === '' || current.away === '') return; // Aún incompleto
    const home = Number(current.home);
    const away = Number(current.away);
    if (!Number.isInteger(home) || !Number.isInteger(away)) return;
    if (home < 0 || away < 0 || home > 30 || away > 30) {
      setErrorMatchId(matchId);
      setErrorMessage('Marcador fuera de rango (0–30)');
      return;
    }

    startTransition(async () => {
      const result = await saveGroupScore({
        match_id: matchId,
        home_score: home,
        away_score: away,
      });
      if (result.error) {
        setErrorMatchId(matchId);
        setErrorMessage(result.error);
      } else {
        setErrorMatchId(null);
        setErrorMessage(null);
      }
    });
  };

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
        className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1"
        role="tablist"
        aria-label="Días con partidos"
      >
        {days.map((day) => {
          const isActive = day.key === selectedDayKey;
          const filled = day.matches.filter((m) => {
            const s = draft.get(m.id);
            return s && s.home !== '' && s.away !== '';
          }).length;
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
                readOnly={readOnly}
                hasError={errorMatchId === match.id}
                onChange={(side, value) => updateField(match.id, side, value)}
                onBlur={() => persistIfReady(match.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mensaje de error global del último save fallido */}
      {errorMessage && (
        <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

interface MatchScoreCardProps {
  match: Match;
  draft: DraftScore;
  readOnly: boolean;
  hasError: boolean;
  onChange: (side: 'home' | 'away', value: string) => void;
  onBlur: () => void;
}

function MatchScoreCard({
  match,
  draft,
  readOnly,
  hasError,
  onChange,
  onBlur,
}: MatchScoreCardProps) {
  const isComplete = draft.home !== '' && draft.away !== '';
  const kicksOffAt = new Date(match.kicks_off_at);

  return (
    <article
      className={cn(
        'border rounded-lg px-[18px] py-[14px] grid grid-cols-1 sm:grid-cols-[110px_minmax(0,1fr)] gap-y-2 sm:gap-x-[18px] font-sans transition-colors',
        hasError && 'border-destructive bg-destructive/5',
        !hasError && isComplete && 'border-primary/40 bg-primary/[0.03]',
        !hasError && !isComplete && 'border-border bg-surface',
      )}
    >
      {/* Hora + check */}
      <div className="flex flex-row sm:flex-col gap-3 sm:gap-1.5 items-center sm:items-start justify-between sm:justify-start">
        <span className="text-[18px] font-semibold text-foreground leading-none">
          {formatMatchTime(kicksOffAt)}
        </span>
        {isComplete && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <CheckCircle2 className="h-3 w-3" />
            Guardado
          </span>
        )}
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
        'disabled:opacity-60 disabled:cursor-not-allowed',
      )}
      aria-label={rest['aria-label']}
    />
  );
}
