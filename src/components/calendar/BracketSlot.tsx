import { cn } from '@/lib/utils';
import { formatBracketSource } from '@/lib/format-bracket-source';

interface BracketSlotProps {
  /** Código del bracket (ej. '1A', 'W73'). Si es null se muestra "Por definir". */
  source: string | null;
  align?: 'left' | 'right';
}

/**
 * Placeholder que reemplaza a TeamLabel cuando un partido eliminatorio
 * todavía no tiene equipo asignado. Trunca con elipsis si el texto es
 * más largo que la columna; el texto completo aparece en hover (tooltip
 * nativo del navegador via `title`).
 */
export function BracketSlot({ source, align = 'left' }: BracketSlotProps) {
  const label = source ? formatBracketSource(source) : 'Por definir';

  return (
    <span
      title={label}
      className={cn(
        'block w-full text-muted-foreground italic truncate cursor-help text-[14px]',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {label}
    </span>
  );
}
