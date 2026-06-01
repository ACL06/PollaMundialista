'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, ListOrdered, Target, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/home', label: 'Inicio', Icon: Home },
  { href: '/calendar', label: 'Calendario', Icon: CalendarDays },
  { href: '/grupos', label: 'Fase de grupos', Icon: ListOrdered },
  { href: '/pronosticos', label: 'Pronósticos', Icon: Target },
  { href: '/comunidad', label: 'Comunidad', Icon: Users },
  { href: '/ranking', label: 'Ranking', Icon: Trophy },
] as const;

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-10">
      {/* En mobile las pestañas no caben: scroll SOLO horizontal
        * (touch-pan-x + overscroll-x-contain evitan el arrastre diagonal/vertical)
        * y un degradado a la derecha insinúa que hay más. */}
      <div className="relative max-w-6xl mx-auto">
        <div className="flex gap-1 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain px-5">
          {tabs.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
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
