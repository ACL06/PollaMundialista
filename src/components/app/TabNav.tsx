'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, ListOrdered, Target, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCenterActiveTab } from '@/lib/use-center-active-tab';

const tabs = [
  { href: '/home', label: 'Inicio', Icon: Home, polla: false },
  { href: '/calendar', label: 'Calendario', Icon: CalendarDays, polla: false },
  { href: '/grupos', label: 'Fase de grupos', Icon: ListOrdered, polla: false },
  { href: '/pronosticos', label: 'Pronósticos', Icon: Target, polla: true },
  { href: '/comunidad', label: 'Comunidad', Icon: Users, polla: true },
  { href: '/ranking', label: 'Ranking', Icon: Trophy, polla: true },
] as const;

/**
 * Navegación principal. En modo espectador (post-lock, no inscrito) se ocultan
 * las pestañas de la polla; quedan Inicio, Calendario y Fase de grupos.
 */
export function TabNav({ isSpectator = false }: { isSpectator?: boolean }) {
  const pathname = usePathname();
  const visibleTabs = isSpectator ? tabs.filter((t) => !t.polla) : tabs;
  const activeHref =
    visibleTabs.find((t) => pathname === t.href || pathname.startsWith(t.href + '/'))?.href ?? null;
  const { containerRef, activeRef } = useCenterActiveTab<HTMLAnchorElement>(activeHref);

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-10">
      {/* En mobile las pestañas no caben: scroll SOLO horizontal
        * (touch-pan-x + overscroll-x-contain evitan el arrastre diagonal/vertical),
        * la pestaña activa queda centrada y un degradado a la derecha insinúa que
        * hay más. En desktop (lg+) SÍ caben todas, así que se centran
        * (`lg:justify-center`) — sin justify-center en mobile para no romper el
        * scroll (con overflow, justify-center oculta el inicio inalcanzable). */}
      <div className="relative max-w-6xl mx-auto">
        <div
          ref={containerRef}
          className="flex gap-1 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain scroll-smooth px-5 lg:justify-center"
        >
          {visibleTabs.map(({ href, label, Icon }) => {
          const isActive = href === activeHref;
          return (
            <Link
              key={href}
              href={href}
              ref={isActive ? activeRef : undefined}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-3.5',
                'text-sm font-medium whitespace-nowrap',
                'border-b-2 -mb-px transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded-t',
                isActive
                  ? 'text-foreground border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
          })}
        </div>
        {/* Degradado en el borde derecho: pista visual de que hay más pestañas
          * (solo en mobile; en desktop caben todas). */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden"
          aria-hidden="true"
        />
      </div>
    </nav>
  );
}
