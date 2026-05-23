import { cn } from '@/lib/utils';
import type { Team } from '@/lib/types/match';

interface TeamLabelProps {
  team: Team;
  align?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export function TeamLabel({ team, align = 'left', size = 'md' }: TeamLabelProps) {
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
        className={cn(
          'text-foreground font-medium truncate',
          size === 'sm' && 'text-[13px]',
          size === 'md' && 'text-[15px]',
          size === 'lg' && 'text-[18px] font-semibold',
        )}
      >
        {team.name}
      </span>
    </div>
  );
}
