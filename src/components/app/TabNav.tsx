'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/home', label: 'Inicio', Icon: Home },
  { href: '/calendar', label: 'Calendario', Icon: CalendarDays },
  { href: '/grupos', label: 'Fase de grupos', Icon: ListOrdered },
] as const;

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-5 flex gap-1">
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
    </nav>
  );
}
