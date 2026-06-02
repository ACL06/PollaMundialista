'use client';

import { useMemo, useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardNav, type WizardStep } from './WizardNav';
import { WelcomeStep } from './steps/WelcomeStep';
import { GroupScoresStep, type GroupScoreDraft } from './steps/GroupScoresStep';
import { BracketStep } from './steps/BracketStep';
import { ClosingStep } from './steps/ClosingStep';
import { ReviewStep } from './steps/ReviewStep';
import {
  saveGroupScore,
  toggleBracketTeam,
  savePredictionMeta,
  submitPrediction,
} from './actions';
import type { Match, Team } from '@/lib/types/match';
import {
  BRACKET_ROUNDS,
  roundsFrom,
  type Prediction,
  type PredictionBracketEntry,
  type PredictionBracketRound,
  type PredictionGroupScore,
} from '@/lib/types/prediction';

type PodiumField = 'champion' | 'runnerUp' | 'third';
type MetaPatch = Parameters<typeof savePredictionMeta>[0];

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
  // `submittedNow` cubre el envío hecho en esta misma sesión (sin recargar).
  const [submittedNow, setSubmittedNow] = useState(false);

  const isLocked = lockAt ? new Date() >= new Date(lockAt) : false;
  const isSubmitted = initialPrediction?.locked_at != null || submittedNow;

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
    if (isLocked) return;
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

  // ── State del step "Cierre" (meta) ───────────────────────────────
  const [champion, setChampion] = useState<string | null>(
    initialPrediction?.champion_code ?? null,
  );
  const [runnerUp, setRunnerUp] = useState<string | null>(
    initialPrediction?.runner_up_code ?? null,
  );
  const [third, setThird] = useState<string | null>(
    initialPrediction?.third_place_code ?? null,
  );
  const [finalHome, setFinalHome] = useState<string>(
    initialPrediction?.final_home_score != null ? String(initialPrediction.final_home_score) : '',
  );
  const [finalAway, setFinalAway] = useState<string>(
    initialPrediction?.final_away_score != null ? String(initialPrediction.final_away_score) : '',
  );
  const [topScorer, setTopScorer] = useState<string>(initialPrediction?.top_scorer ?? '');
  const [metaError, setMetaError] = useState<string | null>(null);
  // Errores por campo (se muestran junto a su control, no en el tope del paso).
  const [finalScoreError, setFinalScoreError] = useState<string | null>(null);
  const [topScorerError, setTopScorerError] = useState<string | null>(null);
  const [metaSaved, setMetaSaved] = useState(false);
  const [metaSaving, startMetaSave] = useTransition();

  const persistMeta = (patch: MetaPatch) => {
    startMetaSave(async () => {
      const result = await savePredictionMeta(patch);
      setMetaError(result.error ?? null);
    });
  };

  /** ¿El goleador tiene nombre y apellido (≥2 palabras)? (#14) */
  const scorerHasFullName = (value: string) => value.trim().split(/\s+/).filter(Boolean).length >= 2;

  /**
   * Botón "Actualizar pronóstico" del Cierre: re-guarda todos los campos
   * válidos y muestra "Guardado ✓" (el cierre ya autoguarda, esto es para
   * tranquilidad del usuario). Omite campos inválidos (su blur ya avisó).
   */
  const handleClosingUpdate = () => {
    if (isLocked) return;
    const patch: MetaPatch = {
      champion_code: champion,
      runner_up_code: runnerUp,
      third_place_code: third,
    };
    const scorer = topScorer.trim();
    if (scorer === '') {
      patch.top_scorer = null;
      setTopScorerError(null);
    } else if (scorerHasFullName(scorer)) {
      patch.top_scorer = scorer;
      setTopScorerError(null);
    } else {
      setTopScorerError('No se guardó el goleador: debe ser mínimo nombre y apellido del jugador.');
    }

    if (finalHome === '' && finalAway === '') {
      patch.final_home_score = null;
      patch.final_away_score = null;
      setFinalScoreError(null);
    } else if (finalHome !== '' && finalAway !== '') {
      const h = Number(finalHome);
      const a = Number(finalAway);
      if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 99 || a > 99) {
        setFinalScoreError('Marcador de la final fuera de rango (0–99)');
      } else if (h < a) {
        setFinalScoreError('El campeón no puede tener menos goles que el subcampeón');
      } else {
        patch.final_home_score = h;
        patch.final_away_score = a;
        setFinalScoreError(null);
      }
    }

    startMetaSave(async () => {
      const result = await savePredictionMeta(patch);
      if (result.error) {
        setMetaError(result.error);
        setMetaSaved(false);
      } else {
        setMetaError(null);
        setMetaSaved(true);
      }
    });
  };

  const handleBracketToggle = (round: PredictionBracketRound, teamCode: string) => {
    if (isLocked) return;
    const isSelected = bracket.get(round)?.has(teamCode) ?? false;
    const bracketSnapshot = cloneBracket(bracket);
    const podiumSnapshot = { champion, runnerUp, third };

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

    // Si la remoción sacó un equipo del podio (ya no está en semifinales),
    // limpiarlo también — no puede ser campeón quien no llegó a semis.
    const sfNow = next.get('sf') ?? new Set<string>();
    const metaPatch: MetaPatch = {};
    if (isSelected) {
      if (champion && !sfNow.has(champion)) {
        setChampion(null);
        metaPatch.champion_code = null;
      }
      if (runnerUp && !sfNow.has(runnerUp)) {
        setRunnerUp(null);
        metaPatch.runner_up_code = null;
      }
      if (third && !sfNow.has(third)) {
        setThird(null);
        metaPatch.third_place_code = null;
      }
    }

    startBracketSave(async () => {
      const result = await toggleBracketTeam({
        round,
        team_code: teamCode,
        selected: !isSelected,
      });
      if (result.error) {
        setBracket(bracketSnapshot); // revertir bracket
        setChampion(podiumSnapshot.champion); // y podio
        setRunnerUp(podiumSnapshot.runnerUp);
        setThird(podiumSnapshot.third);
        setBracketError(result.error);
      } else if (Object.keys(metaPatch).length > 0) {
        await savePredictionMeta(metaPatch);
      }
    });
  };

  const handleSelectPodium = (field: PodiumField, code: string) => {
    if (isLocked) return;
    setMetaSaved(false);
    if (field === 'champion') {
      const value = champion === code ? null : code;
      const patch: MetaPatch = { champion_code: value };
      setChampion(value);
      // El campeón no puede ser también subcampeón ni tercero.
      if (value !== null && runnerUp === value) {
        setRunnerUp(null);
        patch.runner_up_code = null;
      }
      if (value !== null && third === value) {
        setThird(null);
        patch.third_place_code = null;
      }
      persistMeta(patch);
    } else if (field === 'runnerUp') {
      const value = runnerUp === code ? null : code;
      const patch: MetaPatch = { runner_up_code: value };
      setRunnerUp(value);
      if (value !== null && third === value) {
        setThird(null);
        patch.third_place_code = null;
      }
      persistMeta(patch);
    } else {
      const value = third === code ? null : code;
      setThird(value);
      persistMeta({ third_place_code: value });
    }
  };

  const handleFinalScoreChange = (side: 'home' | 'away', raw: string) => {
    const cleaned = sanitizeScore(raw);
    setMetaSaved(false);
    setFinalScoreError(null);
    if (side === 'home') setFinalHome(cleaned);
    else setFinalAway(cleaned);
  };

  const handleFinalScoreBlur = () => {
    if (isLocked) return;
    if (finalHome === '' && finalAway === '') {
      setFinalScoreError(null);
      persistMeta({ final_home_score: null, final_away_score: null });
      return;
    }
    if (finalHome === '' || finalAway === '') return; // incompleto, espera
    const h = Number(finalHome);
    const a = Number(finalAway);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 99 || a > 99) {
      setFinalScoreError('Marcador de la final fuera de rango (0–99)');
      return;
    }
    // El campeón no puede llevar menos goles que el subcampeón (ganó o empató a 90').
    if (h < a) {
      setFinalScoreError('El campeón no puede tener menos goles que el subcampeón');
      return;
    }
    setFinalScoreError(null);
    persistMeta({ final_home_score: h, final_away_score: a });
  };

  const handleTopScorerChange = (value: string) => {
    setMetaSaved(false);
    setTopScorerError(null);
    setTopScorer(value);
  };

  const handleTopScorerBlur = () => {
    if (isLocked) return;
    const trimmed = topScorer.trim();
    if (trimmed === '') {
      setTopScorerError(null);
      persistMeta({ top_scorer: null });
      return;
    }
    // #14: el goleador debe ser nombre y apellido (≥2 palabras).
    if (!scorerHasFullName(trimmed)) {
      setTopScorerError('No se guardó el goleador: debe ser mínimo nombre y apellido del jugador.');
      return;
    }
    setTopScorerError(null);
    persistMeta({ top_scorer: trimmed });
  };

  // ── Submit final ─────────────────────────────────────────────────
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const handleSubmit = () => {
    startSubmit(async () => {
      const result = await submitPrediction();
      if (result.error) {
        setSubmitError(result.error);
      } else {
        setSubmitError(null);
        setSubmittedNow(true);
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
          Puedes editarlo cuando quieras hasta que arranque el Mundial. Después se cierra y queda
          como tu pronóstico final.
        </p>
      </header>

      <WizardNav steps={STEPS} currentIndex={currentIndex} onSelect={setCurrentIndex} />

      {/* Navegación entre PASOS del pronóstico (va aquí, pegada a los pasos,
        * para no confundirla con "siguiente día"). */}
      <div className="flex items-center justify-between gap-3">
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
          Paso anterior
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">
          Paso {currentIndex + 1} / {STEPS.length}
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
          Paso siguiente
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

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
            isSubmitted={false}
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
            isSubmitted={false}
          />
        ) : currentStep.key === 'closing' ? (
          <ClosingStep
            teams={teams}
            semifinalists={Array.from(bracket.get('sf') ?? [])}
            champion={champion}
            runnerUp={runnerUp}
            third={third}
            finalHome={finalHome}
            finalAway={finalAway}
            topScorer={topScorer}
            error={metaError}
            finalScoreError={finalScoreError}
            topScorerError={topScorerError}
            onSelectPodium={handleSelectPodium}
            onChangeFinalScore={handleFinalScoreChange}
            onBlurFinalScore={handleFinalScoreBlur}
            onChangeTopScorer={handleTopScorerChange}
            onBlurTopScorer={handleTopScorerBlur}
            onUpdate={handleClosingUpdate}
            updating={metaSaving}
            saved={metaSaved}
            isLocked={isLocked}
            isSubmitted={false}
          />
        ) : (
          <ReviewStep
            teams={teams}
            groupScoresSaved={groupScoresSavedIds.size}
            groupScoresTotal={groupMatches.length}
            bracketCounts={{
              r32: bracket.get('r32')?.size ?? 0,
              r16: bracket.get('r16')?.size ?? 0,
              qf: bracket.get('qf')?.size ?? 0,
              sf: bracket.get('sf')?.size ?? 0,
            }}
            champion={champion}
            runnerUp={runnerUp}
            third={third}
            finalHome={finalHome}
            finalAway={finalAway}
            topScorer={topScorer}
            isLocked={isLocked}
            isSubmitted={isSubmitted}
            submitting={submitting}
            submitError={submitError}
            onSubmit={handleSubmit}
          />
        )}
      </section>
    </div>
  );
}
