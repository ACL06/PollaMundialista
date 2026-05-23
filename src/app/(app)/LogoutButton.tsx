'use client';

import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOutAction } from './actions';

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      aria-label="Cerrar sesión"
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg',
        'text-foreground hover:bg-muted',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50',
      )}
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
}
