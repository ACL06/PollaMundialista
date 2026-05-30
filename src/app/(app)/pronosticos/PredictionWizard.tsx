'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardNav, type WizardStep } from './WizardNav';
import { WelcomeStep } from './steps/WelcomeStep';
import { PlaceholderStep } from './steps/PlaceholderStep';
import type {
  Prediction,
  PredictionBracketEntry,
  PredictionGroupScore,
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
  lockAt: string | null;
}

/**
 * Wizard cliente que orquesta los 5 steps del pronóstico. Esta versión
 * (Fase 4B.1) solo tiene el step 1 (Bienvenida) funcional; los demás
 * son placeholders. El state global (prediction, scores, bracket) se
 * mantiene aquí y se irá hidratando step a step en las próximas sub-fases.
 */
export function PredictionWizard({
  initialPrediction,
  // initialGroupScores e initialBracket aún no se consumen — se usarán
  // en 4B.2 (marcadores) y 4B.3 (bracket).
  initialGroupScores,
  initialBracket,
  lockAt,
}: PredictionWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const isLocked = lockAt ? new Date() >= new Date(lockAt) : false;
  const isSubmitted = initialPrediction?.locked_at != null;

  // `void` para acallar el unused-var hasta que las sub-fases lo consuman.
  void initialGroupScores;
  void initialBracket;

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
          <PlaceholderStep stepName="Marcadores de fase de grupos" comingIn="4B.2" />
        ) : currentStep.key === 'bracket' ? (
          <PlaceholderStep stepName="Bracket eliminatorio" comingIn="4B.3" />
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
