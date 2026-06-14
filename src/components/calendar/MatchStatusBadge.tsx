import type { MatchStatus } from '@/lib/types/match';

interface MatchStatusBadgeProps {
  status: MatchStatus;
}

export function MatchStatusBadge({ status }: MatchStatusBadgeProps) {
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

  if (status === 'suspended') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-600 whitespace-nowrap">
        Suspendido
      </span>
    );
  }

  return null;
}
