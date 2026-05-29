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
 * todavía no tiene equipo asignado. Span único con `w-full + line-clamp-2`
 * para que textos largos como "Ganador Octavos de Final" o
 * "Tercer Lugar Grupos C/D/F/G/H" se acomoden en dos renglones dentro
 * de su columna del grid en vez de salirse por el borde del card.
 */
export function BracketSlot({ source, align = 'left', size = 'md' }: BracketSlotProps) {
  const label = source ? formatBracketSource(source) : 'Por definir';

  return (
    <span
      className={cn(
        'block w-full text-muted-foreground italic line-clamp-2 leading-tight',
        align === 'right' ? 'text-right' : 'text-left',
        size === 'sm' && 'text-[13px]',
        size === 'md' && 'text-[14px]',
        size === 'lg' && 'text-[16px]',
      )}
    >
      {label}
    </span>
  );
}
