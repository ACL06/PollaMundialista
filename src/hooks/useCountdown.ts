'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Hook para contar regresivamente desde N segundos.
 * Útil para cooldowns de reenvío de OTP.
 */
export function useCountdown(initialSeconds: number = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const start = useCallback((s: number) => setSeconds(s), []);
  const reset = useCallback(() => setSeconds(0), []);

  return { seconds, isActive: seconds > 0, start, reset };
}
