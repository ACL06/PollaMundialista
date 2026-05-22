'use client';

import { useRef, useState, useEffect, type ClipboardEvent, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  resetSignal?: number; // cuando cambia, limpia los inputs
}

export function OtpInput({
  length = 6,
  onComplete,
  disabled = false,
  error = false,
  resetSignal = 0,
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Reset cuando cambia resetSignal
  useEffect(() => {
    if (resetSignal > 0) {
      setDigits(Array(length).fill(''));
      inputsRef.current[0]?.focus();
    }
  }, [resetSignal, length]);

  // Autofocus al primer input al montar
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Solo aceptar dígitos
    const sanitized = value.replace(/\D/g, '');
    if (!sanitized) {
      // Si se borra, actualizar
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    // Tomar solo el último carácter (en caso de typing rápido)
    const digit = sanitized.slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    // Avanzar al siguiente input
    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    // Si está completo, ejecutar onComplete
    const code = next.join('');
    if (code.length === length && !next.includes('')) {
      onComplete(code);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Si está vacío, retroceder
        e.preventDefault();
        inputsRef.current[index - 1]?.focus();
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    const next = Array(length).fill('');
    for (let i = 0; i < pasted.length && i < length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);

    // Focus el siguiente input vacío o el último
    const nextIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[nextIndex]?.focus();

    if (pasted.length === length) {
      onComplete(pasted);
    }
  };

  return (
    <motion.div
      className={cn('flex gap-2 sm:gap-3 justify-center', error && 'animate-shake')}
      key={`otp-${resetSignal}`}
    >
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`Dígito ${i + 1} de ${length}`}
          className={cn(
            'h-14 w-12 sm:h-16 sm:w-14',
            'text-center text-2xl sm:text-3xl font-bold font-mono',
            'rounded-lg border-2 bg-surface text-foreground',
            'transition-all duration-150',
            'focus:outline-none focus:border-tertiary focus:ring-2 focus:ring-tertiary/30',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            digit ? 'border-foreground/30 digit-pop' : 'border-border',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/30',
          )}
        />
      ))}
    </motion.div>
  );
}
