'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardStep {
  key: string;
  label: string;
}

interface WizardNavProps {
  steps: readonly WizardStep[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Barra de progreso del wizard. Cada step es clickeable para saltar.
 * En mobile angosto se acorta el label y solo se muestran números +
 * check para los completados.
 */
export function WizardNav({ steps, currentIndex, onSelect }: WizardNavProps) {
  return (
    <nav
      aria-label="Progreso del pronóstico"
      className="flex items-center gap-1 sm:gap-1.5 border border-border bg-surface rounded-lg p-1"
    >
      {steps.map((step, i) => {
        const isActive = i === currentIndex;
        const isComplete = i < currentIndex;
        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              'flex-1 min-w-0 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-[13px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
              isActive && 'bg-primary text-primary-foreground',
              !isActive && isComplete && 'text-foreground hover:bg-muted',
              !isActive && !isComplete && 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="inline-flex items-center justify-center gap-1.5 min-w-0">
              <span className="text-[10px] tabular-nums opacity-70">{i + 1}</span>
              <span className="truncate hidden sm:inline">{step.label}</span>
              {isComplete && <Check className="h-3 w-3 flex-shrink-0" />}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
