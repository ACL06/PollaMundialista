import { cn } from '@/lib/utils';
import type { Team } from '@/lib/types/match';

interface TeamLabelProps {
  team: Team;
  align?: 'left' | 'right';
}

export function TeamLabel({ team, align = 'left' }: TeamLabelProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2.5 min-w-0',
        align === 'right' ? 'justify-end' : 'justify-start',
      )}
    >
      <span
        className={cn(
          `fi fi-${team.flag} rounded-sm flex-shrink-0`,
          'shadow-[0_0_0_1px_hsl(var(--border))]',
        )}
        style={{ width: 24, height: 18 }}
        aria-hidden="true"
      />
      <span
        title={team.name}
        className="text-foreground font-medium truncate text-[15px]"
      >
        {team.name}
      </span>
    </div>
  );
}
