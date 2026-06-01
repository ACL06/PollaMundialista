'use client';

import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Countdown } from '@/components/pronosticos/Countdown';

interface WelcomeStepProps {
  /** ISO string del momento del lock (kickoff del match #1). Null si no se pudo leer. */
  lockAt: string | null;
  /** True si el momento del lock ya pasó. */
  isLocked: boolean;
  /** True si el usuario ya envió su pronóstico definitivo. */
  isSubmitted: boolean;
  /** Callback que el wizard usa para avanzar al siguiente step. */
  onContinue: () => void;
}

export function WelcomeStep({ lockAt, isLocked, isSubmitted, onContinue }: WelcomeStepProps) {
  const canContinue = !isLocked;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-foreground">¡Hagamos tu pronóstico!</h2>
        <p className="text-muted-foreground leading-relaxed">
          Puedes editarlo cuando quieras hasta que arranque el Mundial. Vas a llenar:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1.5 ml-4 list-disc">
          <li>Los marcadores de los 72 partidos de fase de grupos</li>
          <li>Qué equipos clasifican a cada ronda eliminatoria (32 → 16 → 8 → 4 → 2)</li>
          <li>Tu campeón, subcampeón, tercer lugar y un bonus de marcador exacto en la final</li>
          <li>El goleador del torneo</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Se guarda solo y puedes ir volviendo a ajustarlo. Cuando arranque el Mundial se cierra y
          queda como tu pronóstico final.
        </p>
      </div>

      {lockAt && !isLocked && (
        <div className="bg-surface border border-border rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            ⏱ Cuenta regresiva
          </h3>
          <Countdown targetIsoDate={lockAt} />
          <p className="text-xs text-muted-foreground">
            Después de ese momento ya no se aceptan cambios. Lo que tengas guardado queda
            como tu pronóstico final.
          </p>
        </div>
      )}

      {isLocked && !isSubmitted && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">El pronóstico está cerrado</h3>
            <p className="text-sm text-muted-foreground">
              El plazo terminó. Lo que dejaste guardado quedó como tu pronóstico final.
            </p>
          </div>
        </div>
      )}

      {isSubmitted && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Pronóstico enviado</h3>
            <p className="text-sm text-muted-foreground">
              Ya lo enviaste, pero puedes seguir ajustándolo hasta que arranque el Mundial. Los
              cambios se guardan solos.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={onContinue} disabled={!canContinue}>
          {isLocked ? 'Ver mi pronóstico' : isSubmitted ? 'Seguir editando' : 'Empezar'}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
