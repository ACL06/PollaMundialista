'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { AlertCircle, CheckCircle2, Info, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamLabel } from '@/components/calendar/TeamLabel';
import { BracketSlot } from '@/components/calendar/BracketSlot';
import { formatMatchTime } from '@/lib/format-date';
import {
  KNOCKOUT_SCORE_STAGES,
  knockoutMatchState,
  type KnockoutMatchState,
  type KnockoutScoreStage,
} from '@/lib/knockout-window';
import { saveKnockoutScore } from './actions';
import type { Match } from '@/lib/types/match';
import type { PredictionKnockoutScore } from '@/lib/types/prediction';

const STAGE_LABEL: Record<KnockoutScoreStage, string> = {
  r32: 'Eliminatorias de 32',
  r16: 'Octavos de Final',
  qf: 'Cuartos de Final',
  sf: 'Semifinales',
  '3rd': 'Tercer lugar',
};

interface KnockoutScoresPanelProps {
  /** Partidos de eliminatoria con captura (R32..3er lugar), ordenados por match_number. */
  matches: Match[];
  initialScores: PredictionKnockoutScore[];
  /** Hora del servidor (ISO) para el render inicial determinista. */
  nowIso: string;
}

interface ScoreDraft {
  home: string;
  away: string;
}

/** Permitir solo dígitos y limitar a 2 caracteres (rango 0-99). */
function sanitizeScore(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2);
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Bogota',
  });
}

export function KnockoutScoresPanel({ matches, initialScores, nowIso }: KnockoutScoresPanelProps) {
  // Reloj: arranca con la hora del servidor (render determinista) y se
  // refresca en cliente para que los partidos pasen de "abierto" a "cerrado"
  // sin recargar. La RLS es el guard real del guardado.
  const [now, setNow] = useState(() => new Date(nowIso));
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [draft, setDraft] = useState<Map<string, ScoreDraft>>(() => {
    const map = new Map<string, ScoreDraft>();
    for (const s of initialScores) {
      map.set(s.match_id, { home: String(s.home_score), away: String(s.away_score) });
    }
    return map;
  });
  const [savedIds, setSavedIds] = useState<Set<string>>(
    () => new Set(initialScores.map((s) => s.match_id)),
  );
  const [errors, setErrors] = useState<Map<string, string>>(() => new Map());
  const [, startSave] = useTransition();

  const setError = (matchId: string, message: string | null) => {
    setErrors((prev) => {
      const has = prev.has(matchId);
      if (message === null) {
        if (!has) return prev;
        const next = new Map(prev);
        next.delete(matchId);
        return next;
      }
      if (prev.get(matchId) === message) return prev;
      const next = new Map(prev);
      next.set(matchId, message);
      return next;
    });
  };

  const handleChange = (matchId: string, side: 'home' | 'away', raw: string) => {
    const cleaned = sanitizeScore(raw);
    setDraft((prev) => {
      const next = new Map(prev);
      const current = next.get(matchId) ?? { home: '', away: '' };
      next.set(matchId, { ...current, [side]: cleaned });
      return next;
    });
    setSavedIds((prev) => {
      if (!prev.has(matchId)) return prev;
      const next = new Set(prev);
      next.delete(matchId);
      return next;
    });
  };

  const handleBlur = (matchId: string) => {
    const current = draft.get(matchId);
    if (!current) return;
    if (current.home === '' || current.away === '') return; // incompleto
    const home = Number(current.home);
    const away = Number(current.away);
    if (!Number.isInteger(home) || !Number.isInteger(away)) return;
    if (home < 0 || away < 0 || home > 99 || away > 99) {
      setError(matchId, 'Marcador fuera de rango (0–99)');
      return;
    }
    startSave(async () => {
      const result = await saveKnockoutScore({ match_id: matchId, home_score: home, away_score: away });
      if (result.error) {
        setError(matchId, result.error);
        setSavedIds((prev) => {
          if (!prev.has(matchId)) return prev;
          const next = new Set(prev);
          next.delete(matchId);
          return next;
        });
      } else {
        setSavedIds((prev) => {
          if (prev.has(matchId)) return prev;
          const next = new Set(prev);
          next.add(matchId);
          return next;
        });
        setError(matchId, null);
      }
    });
  };

  // Agrupar por ronda en el orden canónico (R32 → ... → Tercer lugar).
  const sections = useMemo(() => {
    const byStage = new Map<KnockoutScoreStage, Match[]>();
    for (const m of matches) {
      const stage = m.stage as KnockoutScoreStage;
      if (!byStage.has(stage)) byStage.set(stage, []);
      byStage.get(stage)!.push(m);
    }
    return KNOCKOUT_SCORE_STAGES.map((stage) => ({
      stage,
      matches: (byStage.get(stage) ?? []).sort((a, b) => a.match_number - b.match_number),
    })).filter((s) => s.matches.length > 0);
  }, [matches]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-7">
      <header className="space-y-2">
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-foreground">
          Marcadores de eliminatoria
        </h1>
        <p className="text-sm text-muted-foreground">
          Predice el marcador al final del tiempo reglamentario (90&apos; + adición; sin prórroga ni
          penales) de cada partido eliminatorio. Cada cruce se habilita cuando se conocen sus dos
          equipos y se cierra cuando arranca. Son los cruces reales del torneo, independientes de tu
          bracket.
        </p>
      </header>

      {sections.length === 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Todavía no hay partidos de eliminatoria cargados.</span>
        </div>
      ) : (
        sections.map(({ stage, matches: stageMatches }) => {
          const openCount = stageMatches.filter(
            (m) => knockoutMatchState(m, now) === 'open',
          ).length;
          const pendingCount = stageMatches.filter(
            (m) => knockoutMatchState(m, now) === 'pending',
          ).length;
          return (
            <section key={stage} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {STAGE_LABEL[stage]}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {openCount > 0 && `${openCount} abierto${openCount > 1 ? 's' : ''}`}
                  {openCount > 0 && pendingCount > 0 && ' · '}
                  {pendingCount > 0 && `${pendingCount} por definir`}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {stageMatches.map((match) => (
                  <KnockoutMatchCard
                    key={match.id}
                    match={match}
                    state={knockoutMatchState(match, now)}
                    draft={draft.get(match.id) ?? { home: '', away: '' }}
                    isSaved={savedIds.has(match.id)}
                    errorMessage={errors.get(match.id) ?? null}
                    onChange={(side, value) => handleChange(match.id, side, value)}
                    onBlur={() => handleBlur(match.id)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

interface KnockoutMatchCardProps {
  match: Match;
  state: KnockoutMatchState;
  draft: ScoreDraft;
  isSaved: boolean;
  errorMessage: string | null;
  onChange: (side: 'home' | 'away', value: string) => void;
  onBlur: () => void;
}

function KnockoutMatchCard({
  match,
  state,
  draft,
  isSaved,
  errorMessage,
  onChange,
  onBlur,
}: KnockoutMatchCardProps) {
  const kicksOffAt = new Date(match.kicks_off_at);
  const hasError = errorMessage !== null;
  const homeFilled = draft.home !== '';
  const awayFilled = draft.away !== '';
  const isPartial = state === 'open' && !hasError && homeFilled !== awayFilled;
  const hasPrediction = homeFilled && awayFilled;
  const readOnly = state !== 'open';

  return (
    <article
      className={cn(
        'border rounded-lg px-[18px] py-[14px] grid grid-cols-1 sm:grid-cols-[110px_minmax(0,1fr)] gap-y-2 sm:gap-x-[18px] font-sans transition-colors',
        hasError && 'border-destructive bg-destructive/5',
        !hasError && isPartial && 'border-amber-500 bg-amber-500/5',
        !hasError && !isPartial && state === 'open' && isSaved && 'border-primary/40 bg-primary/[0.03]',
        !hasError && !isPartial && !(state === 'open' && isSaved) && 'border-border bg-surface',
      )}
    >
      {/* Hora + estado */}
      <div className="flex flex-row sm:flex-col gap-3 sm:gap-1.5 items-center sm:items-start justify-between sm:justify-start">
        <span className="text-[18px] font-semibold text-foreground leading-none">
          {formatMatchTime(kicksOffAt)}
        </span>
        {state === 'pending' ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Info className="h-3 w-3" />
            Por definir
          </span>
        ) : state === 'closed' ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Lock className="h-3 w-3" />
            Cerrado
          </span>
        ) : isSaved ? (
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

        {state === 'pending' ? (
          <span className="text-muted-foreground font-mono text-sm px-1">vs</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <ScoreInput
              value={draft.home}
              onChange={(v) => onChange('home', v)}
              onBlur={onBlur}
              disabled={readOnly}
              ariaLabel={`Marcador de ${match.home_team?.name ?? 'local'}`}
            />
            <span className="text-muted-foreground font-mono">–</span>
            <ScoreInput
              value={draft.away}
              onChange={(v) => onChange('away', v)}
              onBlur={onBlur}
              disabled={readOnly}
              ariaLabel={`Marcador de ${match.away_team?.name ?? 'visitante'}`}
            />
          </div>
        )}

        {match.away_team ? (
          <TeamLabel team={match.away_team} align="left" />
        ) : (
          <BracketSlot source={match.bracket_source_away} align="left" />
        )}
      </div>

      {/* Error específico */}
      {hasError && (
        <div
          className="col-span-full flex items-center gap-1.5 text-[12px] text-destructive"
          role="alert"
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Nota cuando aún no hay equipos */}
      {state === 'pending' && (
        <div className="col-span-full text-[12px] text-muted-foreground">
          Se habilita cuando se conozcan los dos equipos del cruce.
        </div>
      )}

      {/* Cerrado sin pronóstico */}
      {state === 'closed' && !hasPrediction && (
        <div className="col-span-full text-[12px] text-muted-foreground">
          No registraste marcador para este partido.
        </div>
      )}

      {/* Footer: fecha + sede */}
      <div className="col-span-full flex items-center justify-between gap-3 pt-1.5 border-t border-dashed border-border">
        <span className="text-[12px] text-muted-foreground capitalize">{shortDate(match.kicks_off_at)}</span>
        <span className="text-[12px] text-muted-foreground truncate">{match.venue}</span>
      </div>
    </article>
  );
}

interface ScoreInputProps {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  disabled: boolean;
  ariaLabel: string;
}

function ScoreInput({ value, onChange, onBlur, disabled, ariaLabel }: ScoreInputProps) {
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
        'w-10 h-9 text-center font-mono font-bold text-[18px] tabular-nums',
        'bg-background border border-border rounded-md',
        'focus:outline-none focus:ring-2 focus:ring-tertiary focus:border-tertiary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    />
  );
}
