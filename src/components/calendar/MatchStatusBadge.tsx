import { Clock } from 'lucide-react';
import type { MatchStatus } from '@/lib/types/match';

interface MatchStatusBadgeProps {
  status: MatchStatus;
  locksIn?: string | null;
}

export function MatchStatusBadge({ status, locksIn }: MatchStatusBadgeProps) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-destructive/10 text-destructive whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
        En vivo
      </span>
    );
  }

  if (status === 'final') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-muted text-foreground whitespace-nowrap">
        Final
      </span>
    );
  }

  // scheduled — solo se muestra badge si recibe locksIn (predicciones, Fase 4)
  if (locksIn) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[12px] font-medium bg-tertiary/10 text-tertiary whitespace-nowrap">
        <Clock className="h-3 w-3" />
        Cierra en {locksIn}
      </span>
    );
  }

  return null;
}
