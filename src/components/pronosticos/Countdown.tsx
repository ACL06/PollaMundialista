'use client';

import { useEffect, useState } from 'react';

interface CountdownProps {
  /** ISO string del momento objetivo. */
  targetIsoDate: string;
}

interface Diff {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateDiff(target: Date, now: Date): Diff | null {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return null;

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

/**
 * Cuenta regresiva en tiempo real al momento objetivo (ej. el lock
 * global de los pronósticos). Refresca cada segundo. Cuando llega a
 * cero muestra un aviso de que se acabó el tiempo.
 */
export function Countdown({ targetIsoDate }: CountdownProps) {
  const target = new Date(targetIsoDate);
  const [diff, setDiff] = useState<Diff | null>(() => calculateDiff(target, new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setDiff(calculateDiff(target, new Date()));
    }, 1000);
    return () => window.clearInterval(id);
    // `target` no cambia entre renders (mismo `targetIsoDate`) — la deps
    // del effect es el ISO en sí.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIsoDate]);

  if (!diff) {
    return (
      <p className="font-mono text-sm text-destructive">El plazo ya terminó.</p>
    );
  }

  return (
    <div className="flex items-baseline gap-3 font-mono text-2xl font-bold tabular-nums text-foreground">
      {diff.days > 0 && (
        <>
          <Segment value={diff.days} unit="d" />
          <Sep />
        </>
      )}
      <Segment value={diff.hours} unit="h" pad />
      <Sep />
      <Segment value={diff.minutes} unit="m" pad />
      <Sep />
      <Segment value={diff.seconds} unit="s" pad />
    </div>
  );
}

function Segment({ value, unit, pad = false }: { value: number; unit: string; pad?: boolean }) {
  return (
    <span>
      {pad ? String(value).padStart(2, '0') : value}
      <span className="text-sm font-normal text-muted-foreground ml-0.5">{unit}</span>
    </span>
  );
}

function Sep() {
  return <span className="text-muted-foreground">·</span>;
}
