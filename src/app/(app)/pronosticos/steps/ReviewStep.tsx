'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Lock, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  BRACKET_ROUNDS,
  BRACKET_ROUND_LABEL,
  BRACKET_ROUND_SIZE,
  type PredictionBracketRound,
} from '@/lib/types/prediction';
import type { Team } from '@/lib/types/match';

interface ReviewStepProps {
  teams: Team[];
  groupScoresSaved: number;
  groupScoresTotal: number;
  bracketCounts: Record<PredictionBracketRound, number>;
  champion: string | null;
  runnerUp: string | null;
  third: string | null;
  finalHome: string;
  finalAway: string;
  topScorer: string;
  isLocked: boolean;
  isSubmitted: boolean;
  submitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
}

export function ReviewStep({
  teams,
  groupScoresSaved,
  groupScoresTotal,
  bracketCounts,
  champion,
  runnerUp,
  third,
  finalHome,
  finalAway,
  topScorer,
  isLocked,
  isSubmitted,
  submitting,
  submitError,
  onSubmit,
}: ReviewStepProps) {
  const [confirming, setConfirming] = useState(false);

  const teamName = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teams) map.set(t.code, t.name);
    return (code: string | null) => (code ? (map.get(code) ?? code) : '—');
  }, [teams]);

  const finalScore =
    finalHome !== '' && finalAway !== '' ? `${finalHome} – ${finalAway}` : '—';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Revisión</h2>
        <p className="text-sm text-muted-foreground">
          Este es el resumen de tu pronóstico. Puedes enviarlo ya o seguir editando hasta el
          cierre. <span className="font-medium text-foreground">Al enviar, queda definitivo.</span>
        </p>
      </div>

      {/* Resumen */}
      <dl className="divide-y divide-border rounded-lg border border-border overflow-hidden">
        <SummaryRow
          label="Marcadores de grupos"
          value={`${groupScoresSaved} / ${groupScoresTotal}`}
        />
        {BRACKET_ROUNDS.map((round) => (
          <SummaryRow
            key={round}
            label={BRACKET_ROUND_LABEL[round]}
            value={`${bracketCounts[round]} / ${BRACKET_ROUND_SIZE[round]}`}
          />
        ))}
        <SummaryRow label="Campeón" value={teamName(champion)} highlight={!!champion} />
        <SummaryRow label="Subcampeón" value={teamName(runnerUp)} />
        <SummaryRow label="Tercer puesto" value={teamName(third)} />
        <SummaryRow label="Marcador final (bonus)" value={finalScore} />
        <SummaryRow label="Goleador" value={topScorer.trim() || '—'} />
      </dl>

      {/* Estado / submit */}
      {isSubmitted ? (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">¡Pronóstico enviado!</h3>
            <p className="text-sm text-muted-foreground">
              Quedó registrado como definitivo. Ya no se puede modificar. ¡Suerte!
            </p>
          </div>
        </div>
      ) : isLocked ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">El plazo ya cerró</h3>
            <p className="text-sm text-muted-foreground">
              Lo que tenías guardado quedó como tu pronóstico final.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {submitError && (
            <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {!confirming ? (
            <Button onClick={() => setConfirming(true)} size="lg" fullWidth>
              <Send className="h-4 w-4" />
              Enviar pronóstico
            </Button>
          ) : (
            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
              <p className="text-sm text-foreground font-medium">
                ¿Enviar tu pronóstico definitivo?
              </p>
              <p className="text-xs text-muted-foreground">
                Después de enviar no podrás cambiar ningún marcador, equipo ni dato. Los campos
                que dejes vacíos simplemente no sumarán puntos.
              </p>
              <div className="flex gap-2">
                <Button onClick={onSubmit} loading={submitting} size="md">
                  Sí, enviar definitivo
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={submitting}
                  className={cn(
                    'px-4 text-sm font-medium rounded-lg text-muted-foreground',
                    'hover:text-foreground hover:bg-muted disabled:opacity-50',
                  )}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-surface">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'text-sm font-medium tabular-nums',
          highlight ? 'text-primary' : 'text-foreground',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
