import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBracketSource } from '@/lib/format-bracket-source';

interface BracketSlotProps {
  /** Código del bracket (ej. '1A', 'W73'). Si es null se muestra "Por definir". */
  source: string | null;
  align?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Placeholder que reemplaza a TeamLabel cuando un partido eliminatorio
 * todavía no tiene equipo asignado. Mantiene la misma altura visual que
 * TeamLabel para que la grilla del MatchCard no salte.
 */
export function BracketSlot({ source, align = 'left', size = 'md' }: BracketSlotProps) {
  const label = source ? formatBracketSource(source) : 'Por definir';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2.5 min-w-0',
        align === 'right' ? 'justify-end' : 'justify-start',
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-sm flex-shrink-0',
          'bg-muted text-muted-foreground',
          'shadow-[0_0_0_1px_hsl(var(--border))]',
        )}
        style={{ width: 24, height: 18 }}
        aria-hidden="true"
      >
        <HelpCircle className="h-3 w-3" />
      </span>
      <span
        className={cn(
          'text-muted-foreground italic truncate',
          size === 'sm' && 'text-[13px]',
          size === 'md' && 'text-[14px]',
          size === 'lg' && 'text-[16px]',
        )}
      >
        {label}
      </span>
    </div>
  );
}
