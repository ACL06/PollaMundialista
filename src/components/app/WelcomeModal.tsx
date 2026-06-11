'use client';

import { useEffect, useState } from 'react';
import { Trophy, Users, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeItem {
  emoji: string;
  text: string;
}

/**
 * El ícono viaja como STRING y se resuelve acá adentro: este componente se
 * monta también desde Server Components (RankingView) y las props que cruzan
 * la frontera server→client deben ser serializables — pasar el componente de
 * lucide directo (`icon={Trophy}`) reventaba el render con "Functions cannot
 * be passed directly to Client Components" (500 en /ranking, 11/jun/2026).
 */
const ICONS: Record<WelcomeIcon, LucideIcon> = {
  users: Users,
  trophy: Trophy,
};
export type WelcomeIcon = 'users' | 'trophy';

interface WelcomeModalProps {
  /** Sufijo de la clave de localStorage (ej. 'comunidad' → polla:welcome:comunidad). */
  storageKey: string;
  icon: WelcomeIcon;
  title: string;
  intro: string;
  items: WelcomeItem[];
  ctaLabel: string;
}

/**
 * Modal de bienvenida de una sección: se muestra UNA sola vez por dispositivo
 * (control por localStorage, mismo patrón del EnrollmentReminderModal). Se
 * marca como visto al decidir mostrarlo — así no se repite aunque cierren con
 * una recarga. Sin localStorage (modo privado estricto) no se muestra, para
 * no repetirlo en cada visita.
 */
export function WelcomeModal({
  storageKey,
  icon,
  title,
  intro,
  items,
  ctaLabel,
}: WelcomeModalProps) {
  const Icon = ICONS[icon];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = `polla:welcome:${storageKey}`;
    try {
      if (localStorage.getItem(key)) return; // ya lo vio
      localStorage.setItem(key, new Date().toISOString());
    } catch {
      return;
    }
    setOpen(true);
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`welcome-${storageKey}-title`}
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5 pr-8">
            <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <h2
              id={`welcome-${storageKey}-title`}
              className="text-lg font-bold leading-snug text-foreground"
            >
              {title}
            </h2>
          </div>

          <p className="text-sm text-muted-foreground">{intro}</p>

          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={item.text} className="flex items-start gap-2.5 text-sm text-foreground">
                <span aria-hidden className="flex-shrink-0 text-base leading-5">
                  {item.emoji}
                </span>
                <span className="leading-5">{item.text}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold',
              'bg-primary text-primary-foreground hover:brightness-110 transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
            )}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
