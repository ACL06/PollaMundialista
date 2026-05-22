'use client';

import { useTransition } from 'react';
import { useCountdown } from '@/hooks/useCountdown';
import { sendOtp } from '@/app/(auth)/login/actions';
import { cn } from '@/lib/utils';

interface ResendButtonProps {
  email: string;
  cooldownSeconds?: number;
  onResent?: () => void;
  onError?: (error: string) => void;
}

export function ResendButton({
  email,
  cooldownSeconds = 60,
  onResent,
  onError,
}: ResendButtonProps) {
  const { seconds, isActive, start } = useCountdown(cooldownSeconds);
  const [isPending, startTransition] = useTransition();

  const handleResend = () => {
    if (isActive || isPending) return;
    startTransition(async () => {
      const result = await sendOtp(email);
      if (result.error) {
        onError?.(result.error);
        return;
      }
      start(cooldownSeconds);
      onResent?.();
    });
  };

  if (isActive) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        ¿No te llegó? Reenviar en <span className="font-medium text-foreground">{seconds}s</span>
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground text-center">
      ¿No te llegó?{' '}
      <button
        type="button"
        onClick={handleResend}
        disabled={isPending}
        className={cn(
          'font-medium text-tertiary hover:underline',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded',
          isPending && 'opacity-50 cursor-not-allowed',
        )}
      >
        {isPending ? 'Reenviando…' : 'Reenviar código'}
      </button>
    </p>
  );
}
