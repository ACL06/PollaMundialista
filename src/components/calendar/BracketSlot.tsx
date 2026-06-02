import { cn } from '@/lib/utils';
import { formatBracketSource } from '@/lib/format-bracket-source';

interface BracketSlotProps {
  /** Código del bracket (ej. '1A', 'W73'). Si es null se muestra "Por definir". */
  source: string | null;
  align?: 'left' | 'right';
}

/**
 * Placeholder que reemplaza a TeamLabel cuando un partido eliminatorio
 * todavía no tiene equipo asignado. El texto se envuelve (hasta 2-3 líneas)
 * en vez de truncarse, para que se lea completo también en mobile (el
 * tooltip nativo `title` no se dispara al tocar en celular).
 */
export function BracketSlot({ source, align = 'left' }: BracketSlotProps) {
  const label = source ? formatBracketSource(source) : 'Por definir';

  return (
    <span
      title={label}
      className={cn(
        'block w-full text-muted-foreground italic text-[13px] leading-tight text-balance',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {label}
    </span>
  );
}
