'use client';

import { useMemo, useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardNav, type WizardStep } from './WizardNav';
import { WelcomeStep } from './steps/WelcomeStep';
import { GroupScoresStep, type GroupScoreDraft } from './steps/GroupScoresStep';
import { BracketStep } from './steps/BracketStep';
import { PlaceholderStep } from './steps/PlaceholderStep';
import { saveGroupScore, toggleBracketTeam } from './actions';
import type { Match, Team } from '@/lib/types/match';
import {
  BRACKET_ROUNDS,
  roundsFrom,
  type Prediction,
  type PredictionBracketEntry,
  type PredictionBracketRound,
  type PredictionGroupScore,
} from '@/lib/types/prediction';

const STEPS = [
  { key: 'welcome', label: 'Bienvenida' },
  { key: 'group-scores', label: 'Marcadores' },
  { key: 'bracket', label: 'Bracket' },
  { key: 'closing', label: 'Cierre' },
  { key: 'review', label: 'Revisión' },
] as const satisfies readonly WizardStep[];

interface PredictionWizardProps {
  initialPrediction: Prediction | null;
  initialGroupScores: PredictionGroupScore[];
  initialBracket: PredictionBracketEntry[];
  groupMatches: Match[];
  teams: Team[];
  lockAt: string | null;
}

/** Permitir solo dígitos y limitar a 2 caracteres (rango 0-99). */
function sanitizeScore(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2);
}

function buildInitialDraft(scores: PredictionGroupScore[]): Map<string, GroupScoreDraft> {
  const map = new Map<string, GroupScoreDraft>();
  for (const s of scores) {
    map.set(s.match_id, { home: String(s.home_score), away: String(s.away_score) });
  }
  return map;
}

/** Construye el mapa round → Set(team_codes) desde las filas iniciales. */
function buildInitialBracket(
  entries: PredictionBracketEntry[],
): Map<PredictionBracketRound, Set<string>> {
  const map = new Map<PredictionBracketRound, Set<string>>();
  for (const round of BRACKET_ROUNDS) map.set(round, new Set());
  for (const e of entries) {
    map.get(e.round)?.add(e.team_code);
  }
  return map;
}

/** Copia profunda del mapa de bracket (para snapshots de revert). */
function cloneBracket(
  map: Map<PredictionBracketRound, Set<string>>,
): Map<PredictionBracketRound, Set<string>> {
  const next = new Map<PredictionBracketRound, Set<string>>();
  for (const [round, set] of map) next.set(round, new Set(set));
  return next;
}

/**
 * Wizard cliente que orquesta los 5 steps del pronóstico. El state de
 * cada step (draft, savedIds, errores, tab interno) vive aquí para que
 * sobreviva a la navegación entre steps. Los steps son componentes
 * "dumb" — reciben props y disparan callbacks.
 */
export function PredictionWizard({
  initialPrediction,
  initialGroupScores,
  initialBracket,
  groupMatches,
  teams,
  lockAt,
}: PredictionWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const isLocked = lockAt ? new Date() >= new Date(lockAt) : false;
  const isSubmitted = initialPrediction?.locked_at != null;

  // ── State del step "Marcadores" ──────────────────────────────────
  // Sube al wizard para persistir cuando el usuario cambia de step.
  const initialDraft = useMemo(() => buildInitialDraft(initialGroupScores), [initialGroupScores]);
  const initialSavedIds = useMemo(
    () => new Set(initialGroupScores.map((s) => s.match_id)),
    [initialGroupScores],
  );

  const [groupScoresDraft, setGroupScoresDraft] = useState<Map<string, GroupScoreDraft>>(initialDraft);
  const [groupScoresSavedIds, setGroupScoresSavedIds] = useState<Set<string>>(initialSavedIds);
  const [groupScoresErrors, setGroupScoresErrors] = useState<Map<string, string>>(() => new Map());
  const [groupScoresSelectedDay, setGroupScoresSelectedDay] = useState<string>('');
  const [, startGroupScoreSave] = useTransition();

  /** Modifica errorsByMatch de forma inmutable. */
  const setGroupScoreError = (matchId: string, message: string | null) => {
    setGroupScoresErrors((prev) => {
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

  const handleGroupScoreChange = (
    matchId: string,
    side: 'home' | 'away',
    rawValue: string,
  ) => {
    const cleaned = sanitizeScore(rawValue);
    setGroupScoresDraft((prev) => {
      const next = new Map(prev);
      const current = next.get(matchId) ?? { home: '', away: '' };
      next.set(matchId, { ...current, [side]: cleaned });
      return next;
    });
    setGroupScoresSavedIds((prev) => {
      if (!prev.has(matchId)) return prev;
      const next = new Set(prev);
      next.delete(matchId);
      return next;
    });
    // El error de ESTE partido se mantiene hasta el siguiente blur con
    // valor válido. No se limpia al tipear para evitar parpadeo.
  };

  const handleGroupScoreBlur = (matchId: string) => {
    if (isLocked || isSubmitted) return;
    const current = groupScoresDraft.get(matchId);
    if (!current) return;
    if (current.home === '' || current.away === '') return; // Aún incompleto
    const home = Number(current.home);
    const away = Number(current.away);
    if (!Number.isInteger(home) || !Number.isInteger(away)) return;
    if (home < 0 || away < 0 || home > 99 || away > 99) {
      setGroupScoreError(matchId, 'Marcador fuera de rango (0–99)');
      return;
    }

    startGroupScoreSave(async () => {
      const result = await saveGroupScore({
        match_id: matchId,
        home_score: home,
        away_score: away,
      });
      if (result.error) {
        setGroupScoreError(matchId, result.error);
        setGroupScoresSavedIds((prev) => {
          if (!prev.has(matchId)) return prev;
          const next = new Set(prev);
          next.delete(matchId);
          return next;
        });
      } else {
        setGroupScoresSavedIds((prev) => {
          if (prev.has(matchId)) return prev;
          const next = new Set(prev);
          next.add(matchId);
          return next;
        });
        setGroupScoreError(matchId, null);
      }
    });
  };

  // ── State del step "Bracket" ─────────────────────────────────────
  const initialBracketMap = useMemo(
    () => buildInitialBracket(initialBracket),
    [initialBracket],
  );
  const [bracket, setBracket] = useState(initialBracketMap);
  const [bracketRound, setBracketRound] = useState<PredictionBracketRound>('r32');
  const [bracketError, setBracketError] = useState<string | null>(null);
  const [, startBracketSave] = useTransition();

  const handleBracketToggle = (round: PredictionBracketRound, teamCode: string) => {
    if (isLocked || isSubmitted) return;
    const isSelected = bracket.get(round)?.has(teamCode) ?? false;
    const snapshot = cloneBracket(bracket);

    // Optimista: actualizar local primero.
    const next = cloneBracket(bracket);
    if (isSelected) {
      // Quitar: cascada a esta ronda y todas las posteriores.
      for (const r of roundsFrom(round)) next.get(r)?.delete(teamCode);
    } else {
      next.get(round)?.add(teamCode);
    }
    setBracket(next);
    setBracketError(null);

    startBracketSave(async () => {
      const result = await toggleBracketTeam({
        round,
        team_code: teamCode,
        selected: !isSelected,
      });
      if (result.error) {
        setBracket(snapshot); // revertir
        setBracketError(result.error);
      }
    });
  };

  const goNext = () => {
    if (currentIndex < STEPS.length - 1) setCurrentIndex(currentIndex + 1);
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const currentStep = STEPS[currentIndex];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-foreground">
          Mi pronóstico
        </h1>
        <p className="text-sm text-muted-foreground">
          Una sola entrega antes del partido inaugural. Después no se aceptan cambios.
        </p>
      </header>

      <WizardNav steps={STEPS} currentIndex={currentIndex} onSelect={setCurrentIndex} />

      <section
        aria-labelledby="step-heading"
        className="bg-surface border border-border rounded-xl p-5 sm:p-7"
      >
        {currentStep.key === 'welcome' ? (
          <WelcomeStep
            lockAt={lockAt}
            isLocked={isLocked}
            isSubmitted={isSubmitted}
            onContinue={goNext}
          />
        ) : currentStep.key === 'group-scores' ? (
          <GroupScoresStep
            matches={groupMatches}
            draft={groupScoresDraft}
            savedIds={groupScoresSavedIds}
            errors={groupScoresErrors}
            selectedDayKey={groupScoresSelectedDay}
            onSelectDay={setGroupScoresSelectedDay}
            onChangeField={handleGroupScoreChange}
            onBlurField={handleGroupScoreBlur}
            isLocked={isLocked}
            isSubmitted={isSubmitted}
          />
        ) : currentStep.key === 'bracket' ? (
          <BracketStep
            teams={teams}
            bracket={bracket}
            activeRound={bracketRound}
            onSelectRound={setBracketRound}
            onToggle={handleBracketToggle}
            error={bracketError}
            isLocked={isLocked}
            isSubmitted={isSubmitted}
          />
        ) : currentStep.key === 'closing' ? (
          <PlaceholderStep stepName="Campeón, goleador y bonus" comingIn="4B.4" />
        ) : (
          <PlaceholderStep stepName="Revisión y envío final" comingIn="4B.4" />
        )}
      </section>

      <footer className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className={cn(
            'inline-flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {currentIndex + 1} / {STEPS.length}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={currentIndex === STEPS.length - 1}
          className={cn(
            'inline-flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
          )}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </button>
      </footer>
    </div>
  );
}
