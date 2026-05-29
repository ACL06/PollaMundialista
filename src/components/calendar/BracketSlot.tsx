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
 * todavía no tiene equipo asignado. Sin icono — el texto en cursiva ya
 * comunica que es un slot por definir, y quitarlo libera espacio para
 * que `line-clamp-2` acomode los labels largos en dos renglones.
 */
export function BracketSlot({ source, align = 'left', size = 'md' }: BracketSlotProps) {
  const label = source ? formatBracketSource(source) : 'Por definir';

  return (
    <div
      className={cn(
        'flex min-w-0 w-full',
        align === 'right' ? 'justify-end text-right' : 'justify-start text-left',
      )}
    >
      <span
        className={cn(
          // line-clamp-2 + leading-tight permite que textos largos
          // como "Tercer Lugar Grupos C/D/F/G/H" entren completos en
          // dos renglones, en vez de cortarse en una sola línea.
          'text-muted-foreground italic line-clamp-2 leading-tight',
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
