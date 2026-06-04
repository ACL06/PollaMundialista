'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PronosticosTabsProps {
  /** El wizard editable o la vista read-only del pronóstico principal. */
  miPronostico: ReactNode;
  /** Panel de marcadores de eliminatoria (captura por partido). */
  eliminatorias: ReactNode;
  /** Pestaña inicial (deep-link `?tab=eliminatorias` desde el aviso de /home). */
  initialTab?: 'mio' | 'eliminatorias';
}

/**
 * Conmutador entre el pronóstico principal (grupos + bracket + cierre, que
 * se cierra al lock global) y los marcadores de eliminatoria (módulo vivo
 * que abre por partido). Ambos paneles se mantienen montados y se alternan
 * con `hidden` para no perder el estado en curso al cambiar de pestaña.
 */
export function PronosticosTabs({ miPronostico, eliminatorias, initialTab = 'mio' }: PronosticosTabsProps) {
  const [tab, setTab] = useState<'mio' | 'eliminatorias'>(initialTab);

  return (
    <div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <div role="tablist" aria-label="Secciones del pronóstico" className="flex gap-2">
          <TabButton active={tab === 'mio'} onClick={() => setTab('mio')}>
            Mi pronóstico
          </TabButton>
          <TabButton active={tab === 'eliminatorias'} onClick={() => setTab('eliminatorias')}>
            Eliminatorias
          </TabButton>
        </div>
      </div>

      <div className={tab === 'mio' ? '' : 'hidden'}>{miPronostico}</div>
      <div className={tab === 'eliminatorias' ? '' : 'hidden'}>{eliminatorias}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
