'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full h-11 px-4 rounded-lg',
          'bg-surface text-foreground placeholder:text-muted-foreground',
          'border border-border',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-tertiary focus:border-tertiary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-destructive focus:ring-destructive focus:border-destructive',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
