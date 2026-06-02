import { CheckCircle2, Clock, Crown, Info, Landmark, Medal, MessageCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CopyButton } from '@/components/home/CopyButton';
import {
  BREB_HOLDER,
  BREB_KEY,
  ENROLLMENT_COST_COP,
  PAYMENT_WHATSAPP_DISPLAY,
  PAYMENT_WHATSAPP_URL,
  WHATSAPP_GROUP_URL,
  computePrizes,
  formatCOP,
} from '@/lib/prizes';

interface EnrollmentPrizesProps {
  enrolledCount: number;
  /** true cuando ya arrancó el torneo (partido inaugural) → se revelan montos. */
  revealed: boolean;
}

/** Nicknames de ejemplo para el podio (solo visual, hasta que haya ranking real). */
const PODIUM_EXAMPLE = [
  { place: 2 as const, nickname: 'mile23' },
  { place: 1 as const, nickname: 'crack_07' },
  { place: 3 as const, nickname: 'la_pana' },
];

export function EnrollmentPrizes({ enrolledCount, revealed }: EnrollmentPrizesProps) {
  const prizes = computePrizes(enrolledCount);
  const prizeByPlace: Record<number, number> = {
    1: prizes.podium[0],
    2: prizes.podium[1],
    3: prizes.podium[2],
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Inscripción y premios</h2>
        <p className="text-sm text-muted-foreground">Así funciona el acumulado, claro y transparente.</p>
      </div>

      {/* Qué significan los estados */}
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
        Al registrarte quedas <span className="font-semibold text-destructive">pre-inscrito</span>. Pasas a{' '}
        <span className="font-semibold text-primary">inscrito</span> cuando el administrador confirma tu
        pago (se hace por un medio externo; la app no cobra en línea).
      </div>

      {/* Costo + inscritos */}
      <div className="grid grid-cols-2 gap-3">
        <Fact label="Costo de inscripción" value={formatCOP(ENROLLMENT_COST_COP)} />
        <Fact
          label="Inscritos"
          value={String(enrolledCount)}
          hint={enrolledCount === 1 ? 'participante' : 'participantes'}
          icon={<Users className="h-5 w-5 text-tertiary" />}
        />
      </div>

      {/* Cómo pagar: llave Bre-B */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Landmark className="h-4 w-4 text-tertiary" />
          Cómo pagar tu inscripción
        </h3>
        <p className="text-sm text-muted-foreground">
          Consigna a esta llave <span className="font-medium text-foreground">Bre-B</span> y avísale al
          administrador para que te marque como inscrito.
        </p>
        <div className="flex flex-col gap-1 rounded-md bg-muted/40 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Llave Bre-B</span>
            <span className="inline-flex items-center gap-1">
              <span className="font-semibold tabular-nums text-foreground">{BREB_KEY}</span>
              <CopyButton value={BREB_KEY} label="Copiar la llave Bre-B" />
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">A nombre de</span>
            <span className="font-medium text-foreground">{BREB_HOLDER}</span>
          </div>
        </div>

        {/* Aviso: enviar comprobante por WhatsApp (recuadro azul claro) */}
        <div className="flex items-start gap-2.5 rounded-md border border-tertiary/30 bg-tertiary/10 p-3 text-sm text-foreground">
          <MessageCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-tertiary" />
          <p>
            Luego de pagar, <span className="font-semibold">envía el comprobante</span> al WhatsApp{' '}
            <a
              href={PAYMENT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-tertiary underline underline-offset-2 hover:no-underline"
            >
              {PAYMENT_WHATSAPP_DISPLAY}
            </a>
            .
          </p>
        </div>
      </div>

      {/* Pozo: se revela en el partido inaugural */}
      <div className="rounded-lg border border-border bg-surface p-4">
        {revealed ? (
          <div className="space-y-2">
            <Row label="Monto acumulado" value={formatCOP(prizes.pot)} />
            <Row label="Administración (10%)" value={formatCOP(prizes.adminCut)} muted />
            <Row label="Para premios (90%)" value={formatCOP(prizes.prizePool)} strong />
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-tertiary" />
            <span>
              El premio se calcula según la cantidad de inscritos y{' '}
              <span className="font-medium text-foreground">se revela en el partido inaugural</span> del
              Mundial. Por ahora vamos {enrolledCount} {enrolledCount === 1 ? 'inscrito' : 'inscritos'}.
            </span>
          </div>
        )}
      </div>

      {/* Podio */}
      <Podium prizeByPlace={prizeByPlace} revealed={revealed} />

      {/* Reparto + empates */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
        <p>
          <span className="font-semibold text-foreground">Reparto:</span> del monto acumulado se
          aparta un <span className="font-medium text-foreground">10% para la administración</span>{' '}
          de la polla. El resto se reparte en el podio:{' '}
          <span className="font-medium text-foreground">1° 70% · 2° 20% · 3° 10%</span>.
        </p>
        <p>
          <span className="font-semibold text-foreground">Empates:</span> si dos o más participantes
          terminan con los mismos puntos, ese premio se reparte en partes iguales entre ellos.
        </p>
      </div>

      {/* Contacto: grupo de WhatsApp */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">¿Dudas? Únete al grupo de la polla:</p>
        <a
          href={WHATSAPP_GROUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold',
            'bg-primary text-primary-foreground hover:brightness-110 transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          <MessageCircle className="h-4 w-4" />
          Unirme al grupo de WhatsApp
        </a>
      </div>
    </section>
  );
}

/** Badge de estado de inscripción, para mostrar bajo el saludo en /home. */
export function EnrollmentBadge({ enrolled }: { enrolled: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
        enrolled ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
      )}
    >
      {enrolled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      {enrolled ? 'Inscrito' : 'Pre-inscrito'}
    </span>
  );
}

function Fact({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-foreground tabular-nums">
        {icon}
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={muted ? 'text-muted-foreground' : 'text-foreground'}>{label}</span>
      <span
        className={cn(
          'tabular-nums',
          strong ? 'font-bold text-primary' : muted ? 'text-muted-foreground' : 'font-medium text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  );
}

const STEP: Record<number, { h: string; bar: string; icon: React.ReactNode }> = {
  1: { h: 'h-24', bar: 'bg-primary/15 border-primary/40', icon: <Crown className="h-5 w-5 text-amber-500 fill-amber-400" /> },
  2: { h: 'h-16', bar: 'bg-muted border-border', icon: <Medal className="h-4 w-4 text-zinc-400" /> },
  3: { h: 'h-12', bar: 'bg-muted border-border', icon: <Medal className="h-4 w-4 text-amber-700" /> },
};

function Podium({
  prizeByPlace,
  revealed,
}: {
  prizeByPlace: Record<number, number>;
  revealed: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="mb-3 text-center text-xs text-muted-foreground uppercase tracking-wider">
        El podio de la polla
      </p>
      <div className="grid grid-cols-3 gap-2 items-end">
        {PODIUM_EXAMPLE.map(({ place, nickname }) => {
          const s = STEP[place];
          return (
            <div key={place} className="flex flex-col items-center gap-1.5">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted"
                aria-hidden="true"
              >
                {s.icon}
              </span>
              <span className="max-w-full truncate text-[13px] font-medium text-foreground">
                {nickname}
              </span>
              <div
                className={cn(
                  'flex w-full flex-col items-center justify-start gap-0.5 rounded-t-md border-x border-t pt-1.5',
                  s.bar,
                  s.h,
                )}
              >
                <span className="text-lg font-bold tabular-nums text-foreground">{place}°</span>
                {revealed && (
                  <span className="text-[11px] font-semibold tabular-nums text-foreground/80">
                    {formatCOP(prizeByPlace[place])}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Nombres de ejemplo. El podio real se arma con el ranking final.
      </p>
    </div>
  );
}
