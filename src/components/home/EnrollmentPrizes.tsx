import { CheckCircle2, Clock, Crown, Info, Landmark, Medal, MessageCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CopyButton } from '@/components/home/CopyButton';
import { PodiumNames } from '@/components/home/PodiumNames';
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

/** Un ganador real del podio (top-3 del ranking). */
export interface PodiumWinner {
  /** Posición de competición (empates comparten número). */
  rank: number;
  /** Nombre y apellidos (displayName) — NUNCA el nickname. */
  name: string;
}

interface EnrollmentPrizesProps {
  enrolledCount: number;
  /** Pre-inscritos: registrados que aún no confirman pago. */
  preEnrolledCount: number;
  /** true cuando ya arrancó el torneo (partido inaugural) → se revelan montos. */
  revealed: boolean;
  /**
   * Top-3 real del ranking (Nombre Apellidos), o null si aún no hay resultados
   * → se muestra el podio de ejemplo. El podio NO muestra montos (esos viven en
   * la sección de reparto, ya explicados).
   */
  podium?: PodiumWinner[] | null;
  /** True si el torneo terminó (hay campeón) → podio definitivo; si no, provisional. */
  podiumFinal?: boolean;
}

// Premios por puesto: medalla, % y tinte oro/plata/bronce (igual que el podio).
// El monto en pesos sale de `computePrizes().podium[i]`.
const PRIZE_TIERS = [
  { place: '1°', pct: 70, tint: 'border-amber-400/50 bg-amber-400/10', icon: <Crown className="h-5 w-5 text-amber-500 fill-amber-400" /> },
  { place: '2°', pct: 20, tint: 'border-zinc-400/50 bg-zinc-400/10', icon: <Medal className="h-5 w-5 text-zinc-400 fill-zinc-300" /> },
  { place: '3°', pct: 10, tint: 'border-amber-700/50 bg-amber-700/10', icon: <Medal className="h-5 w-5 text-amber-700 fill-amber-700/40" /> },
] as const;

export function EnrollmentPrizes({
  enrolledCount,
  preEnrolledCount,
  revealed,
  podium = null,
  podiumFinal = false,
}: EnrollmentPrizesProps) {
  const prizes = computePrizes(enrolledCount);

  return (
    <section className="flex flex-col gap-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          {revealed ? 'Premios' : 'Inscripción y premios'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {revealed
            ? 'El pozo, el podio y cómo se reparte.'
            : 'Así funciona el acumulado, claro y transparente.'}
        </p>
      </div>

      {/* Fase de inscripción (estados, costo, cómo pagar): se oculta al cerrar
          el lock global — ya no se puede inscribir. Post-lock queda solo el
          pozo, el podio, el reparto/empates y el grupo de WhatsApp. */}
      {!revealed && (
        <>
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
              hint={`+ ${preEnrolledCount} pre-inscrito${preEnrolledCount === 1 ? '' : 's'}`}
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
              Consigna a esta llave <span className="font-medium text-foreground">Bre-B</span> y guarda tu
              comprobante de pago, lo necesitarás más adelante.
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
                Luego de consignar, <span className="font-semibold">envía el comprobante</span> al WhatsApp{' '}
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
        </>
      )}

      {/* Podio (solo personas; el pozo y los montos van en la sección de premios). */}
      <Podium winners={podium} isFinal={podiumFinal} />

      {/* Premios: pozo + reparto por puesto + empates, todo junto (coherente). */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-3">
        {/* Pozo: post-lock los montos; pre-lock, el teaser de "se revela al arrancar". */}
        {revealed ? (
          <div className="space-y-2">
            <Row label="Monto acumulado" value={formatCOP(prizes.pot)} />
            <Row label="Administración (10%)" value={formatCOP(prizes.adminCut)} muted />
            <Row label="Para premios (90%)" value={formatCOP(prizes.prizePool)} strong />
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-tertiary" />
            <span>
              El premio se calcula según la cantidad de inscritos y{' '}
              <span className="font-medium text-foreground">se revela en el partido inaugural</span> del
              Mundial. Por ahora vamos {enrolledCount} {enrolledCount === 1 ? 'inscrito' : 'inscritos'}.
            </span>
          </div>
        )}

        {/* Premios por puesto: 3 tarjetas oro/plata/bronce. Pre-lock el % es el
            protagonista (el monto se revela en el inaugural, ya avisado arriba);
            post-lock se muestra el monto. */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Premios por puesto
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PRIZE_TIERS.map((t, i) => (
              <div
                key={t.place}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center shadow-sm',
                  t.tint,
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/70 shadow-sm">
                  {t.icon}
                </span>
                <span className="text-xs font-semibold text-foreground">{t.place}</span>
                {revealed ? (
                  <>
                    <span className="text-sm font-bold tabular-nums text-foreground sm:text-base">
                      {formatCOP(prizes.podium[i])}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{t.pct}%</span>
                  </>
                ) : (
                  <span className="text-base font-bold tabular-nums text-foreground">{t.pct}%</span>
                )}
              </div>
            ))}
          </div>
        </div>

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

// Escalón del podio por PUESTO (rank): 1 = oro/alto, 2 = plata/medio, 3 = bronce/bajo.
const STEP: Record<1 | 2 | 3, { h: string; bar: string; icon: React.ReactNode }> = {
  1: { h: 'h-24', bar: 'bg-amber-400/15 border-amber-400/50', icon: <Crown className="h-5 w-5 text-amber-500 fill-amber-400" /> },
  2: { h: 'h-16', bar: 'bg-zinc-400/15 border-zinc-400/50', icon: <Medal className="h-4 w-4 text-zinc-400 fill-zinc-300" /> },
  3: { h: 'h-12', bar: 'bg-amber-700/15 border-amber-700/50', icon: <Medal className="h-4 w-4 text-amber-700 fill-amber-700/40" /> },
};

// Orden visual de los puestos: 2° a la izquierda, 1° al centro, 3° a la derecha.
const PODIUM_ORDER: (1 | 2 | 3)[] = [2, 1, 3];

// Podio de ejemplo (aún sin resultados). Nombres genéricos que muestran el formato corto.
const PODIUM_EXAMPLE: PodiumWinner[] = [
  { rank: 1, name: 'Ana Gómez' },
  { rank: 2, name: 'Luis Martínez' },
  { rank: 3, name: 'Sara Peña' },
];

// Chispas sutiles (fuegos pirotécnicos discretos) sobre el podio cuando hay
// ganadores reales. Solo CSS (animate-ping escalonado, dorado); posiciones/
// tiempos variados para que no se vea mecánico. Se desactiva con
// prefers-reduced-motion (motion-reduce:hidden en el contenedor).
const SPARKS = [
  { left: '12%', top: 4, size: 'h-1.5 w-1.5', color: 'bg-amber-400', delay: '0s', dur: '2s' },
  { left: '30%', top: 14, size: 'h-1 w-1', color: 'bg-amber-300', delay: '0.7s', dur: '2.4s' },
  { left: '50%', top: 2, size: 'h-1.5 w-1.5', color: 'bg-amber-400', delay: '1.2s', dur: '2.1s' },
  { left: '68%', top: 12, size: 'h-1 w-1', color: 'bg-amber-300', delay: '0.4s', dur: '2.5s' },
  { left: '86%', top: 6, size: 'h-1.5 w-1.5', color: 'bg-amber-400', delay: '1.6s', dur: '2.2s' },
] as const;

function Podium({ winners, isFinal }: { winners: PodiumWinner[] | null; isFinal: boolean }) {
  // Datos reales o, si aún no hay, el ejemplo. (TS narrowea `winners` en el else.)
  const data: PodiumWinner[] = !winners || winners.length === 0 ? PODIUM_EXAMPLE : winners;
  const isExample = data === PODIUM_EXAMPLE;
  // Estado del podio: ejemplo (sin resultados) → provisional (en curso) → final.
  const status: 'example' | 'provisional' | 'final' = isExample
    ? 'example'
    : isFinal
      ? 'final'
      : 'provisional';

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface p-4">
      {/* Chispas sutiles (fuegos pirotécnicos discretos) para hacer el podio
          llamativo, pre y post lock. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 motion-reduce:hidden" aria-hidden="true">
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className={cn('absolute rounded-full animate-ping', s.size, s.color)}
            style={{ left: s.left, top: s.top, animationDelay: s.delay, animationDuration: s.dur }}
          />
        ))}
      </div>
      <div className="relative mb-3 flex items-center justify-center gap-2">
        <p className="text-center text-xs text-muted-foreground uppercase tracking-wider">
          El podio de la polla
        </p>
        {status === 'provisional' && (
          <span className="inline-flex items-center rounded-full bg-tertiary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tertiary">
            Provisional
          </span>
        )}
        {status === 'final' && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Final
          </span>
        )}
      </div>
      {/* Cada escalón (puesto) apila a TODOS los usuarios con ese rank → tolera
          empates (varios en 1°, varios en 2°…); por eso el nombre va corto. */}
      <div className="grid grid-cols-3 gap-2 items-end">
        {PODIUM_ORDER.map((rank) => {
          const s = STEP[rank];
          const users = data.filter((w) => w.rank === rank);
          return (
            <div key={rank} className="flex flex-col items-center gap-1.5">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted"
                aria-hidden="true"
              >
                {s.icon}
              </span>
              {/* min-h reserva ~2 líneas para que las columnas con empate
                  (carrusel) alineen con las de un solo nombre, sin dejar tanto
                  espacio hacia la escalera. */}
              <div className="flex min-h-[1.75rem] w-full flex-col items-center justify-center">
                <PodiumNames names={users.map((u) => u.name)} muted={isExample} />
              </div>
              <div
                className={cn(
                  'flex w-full flex-col items-center justify-start rounded-t-md border-x border-t pt-1.5',
                  s.bar,
                  s.h,
                )}
              >
                <span className="text-lg font-bold tabular-nums text-foreground">{rank}°</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {status === 'example'
          ? 'Ejemplo. El podio se arma con el ranking cuando haya resultados.'
          : status === 'provisional'
            ? 'Así va por ahora — cambia con cada resultado. Los empates comparten puesto.'
            : '¡Podio final del Mundial! 🏆 Los empates comparten puesto.'}
      </p>
    </div>
  );
}
