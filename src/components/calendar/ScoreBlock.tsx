import { cn } from '@/lib/utils';

interface ScoreBlockProps {
  home: number;
  away: number;
  dim?: boolean;
}

export function ScoreBlock({ home, away, dim = false }: ScoreBlockProps) {
  return (
    <div
      className={cn(
        'inline-flex items-baseline gap-2 font-mono font-bold',
        'text-[22px] leading-none',
        'px-2.5 py-1 rounded-md',
        dim ? 'text-muted-foreground bg-transparent' : 'text-foreground bg-muted',
      )}
    >
      <span>{home}</span>
      <span className="text-muted-foreground font-normal">–</span>
      <span>{away}</span>
    </div>
  );
}
