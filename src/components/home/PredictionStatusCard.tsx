import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, PartyPopper, Target } from 'lucide-react';
import { Countdown } from '@/components/pronosticos/Countdown';
import { BRACKET_ROUND_SIZE } from '@/lib/types/prediction';
import { cn } from '@/lib/utils';

interface PredictionStatusCardProps {
  lockAtIso: string | null;
  isLocked: boolean;
  isSubmitted: boolean;
  scoresCount: number; // 0-72
  bracketCount: number; // 0-60
  metaCount: number; // 0-5 (campeón, sub, 3ero, marcador final, goleador)
}

const TOTAL_GROUP = 72;
const TOTAL_BRACKET = Object.values(BRACKET_ROUND_SIZE).reduce((a, b) => a + b, 0); // 32+16+8+4 = 60
const TOTAL_META = 5; // campeón, subcampeón, 3er puesto, marcador final, goleador
const TOTAL_DECISIONS = TOTAL_GROUP + TOTAL_BRACKET + TOTAL_META; // 137

const ctaClass = cn(
  'inline-flex items-center justify-center gap-2 rounded-lg h-11 px-5 text-sm font-medium',
  'bg-primary text-primary-foreground hover:brightness-110 transition-all',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
);

const secondaryClass = cn(
  'inline-flex items-center justify-center gap-2 rounded-lg h-11 px-5 text-sm font-medium',
  'border border-border text-foreground hover:bg-muted transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
);

export function PredictionStatusCard({
  lockAtIso,
  isLocked,
  isSubmitted,
  scoresCount,
  bracketCount,
  metaCount,
}: PredictionStatusCardProps) {
  const filled = scoresCount + bracketCount + metaCount;
  const pct = Math.round((filled / TOTAL_DECISIONS) * 100);
  const nothingStarted = filled === 0;

  // ── Enviado (definitivo) ──────────────────────────────────────────
  if (isSubmitted) {
    return (
      <Card>
        <Badge tone="primary" Icon={CheckCircle2}>
          Pronóstico enviado
        </Badge>
        <p className="text-sm text-muted-foreground">
          Tu pronóstico quedó registrado como definitivo. ¡Mucha suerte! 🍀
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/pronosticos" className={ctaClass}>
            Ver mi pronóstico
            <ArrowRight className="h-4 w-4" />
          </Link>
          {isLocked && (
            <Link href="/comunidad" className={secondaryClass}>
              Ver Comunidad
            </Link>
          )}
        </div>
      </Card>
    );
  }

  // ── El plazo cerró sin envío explícito ────────────────────────────
  if (isLocked) {
    return (
      <Card>
        <Badge tone="primary" Icon={PartyPopper}>
          ¡El Mundial arrancó!
        </Badge>
        <p className="text-sm text-muted-foreground">
          El plazo cerró. Lo que tenías guardado quedó como tu pronóstico final.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/pronosticos" className={ctaClass}>
            Ver mi pronóstico
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/comunidad" className={secondaryClass}>
            Ver Comunidad
          </Link>
        </div>
      </Card>
    );
  }

  // ── Editable (antes del lock) ─────────────────────────────────────
  return (
    <Card>
      <Badge tone="tertiary" Icon={Target}>
        Tu pronóstico
      </Badge>

      {lockAtIso && (
        <div className="space-y-1.5">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
            <Clock className="h-3.5 w-3.5" />
            Cierra en
          </p>
          <Countdown targetIsoDate={lockAtIso} />
        </div>
      )}

      {/* Progreso */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {scoresCount}/{TOTAL_GROUP} marcadores
          </span>
          <span className="tabular-nums">{pct}% completo</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {nothingStarted
          ? 'Aún no has empezado. Llena tus marcadores, el bracket y tu campeón antes del cierre.'
          : 'Puedes seguir editando y guardando hasta que arranque el Mundial.'}
      </p>

      <div className="pt-1">
        <Link href="/pronosticos" className={ctaClass}>
          {nothingStarted ? 'Empezar mi pronóstico' : 'Continuar mi pronóstico'}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-xl p-5 sm:p-6 text-left flex flex-col gap-3">
      {children}
    </section>
  );
}

function Badge({
  tone,
  Icon,
  children,
}: {
  tone: 'primary' | 'tertiary';
  Icon: typeof Target;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full text-sm font-semibold',
        tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary',
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </div>
  );
}
