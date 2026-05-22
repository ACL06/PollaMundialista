'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { OtpInput } from '@/components/auth/OtpInput';
import { ResendButton } from '@/components/auth/ResendButton';
import { verifyOtp } from './actions';
import { maskEmail } from '@/lib/utils';

interface VerifyFormProps {
  email: string;
}

type Status = 'idle' | 'verifying' | 'success' | 'error';

const MAX_ATTEMPTS = 3;

export function VerifyForm({ email }: VerifyFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [isPending, startTransition] = useTransition();

  const handleComplete = (code: string) => {
    setStatus('verifying');
    setError(null);

    startTransition(async () => {
      const result = await verifyOtp(email, code);

      if (result.error) {
        const newAttempts = attemptsLeft - 1;
        setAttemptsLeft(newAttempts);

        if (newAttempts <= 0) {
          // Sin intentos restantes → forzar reenvío desde /login
          router.push(`/login?reason=otp_blocked`);
          return;
        }

        setStatus('error');
        const remainingMsg =
          newAttempts === 1
            ? 'Te queda 1 intento.'
            : `Te quedan ${newAttempts} intentos.`;
        setError(`${result.error}. ${remainingMsg}`);
        setTimeout(() => {
          setResetSignal((s) => s + 1);
          setStatus('idle');
        }, 1500);
        return;
      }

      setStatus('success');
      setTimeout(() => router.push('/home'), 600);
    });
  };

  const handleResent = () => {
    setError(null);
    setResetSignal((s) => s + 1);
    setAttemptsLeft(MAX_ATTEMPTS);
  };

  return (
    <>
      <div className="flex flex-col items-center text-center space-y-3">
        <Logo variant="full" width={200} height={50} />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
            Revisa tu correo
          </h1>
          <p className="text-sm text-muted-foreground">
            Enviamos un código a{' '}
            <span className="font-medium text-foreground">{maskEmail(email)}</span>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <OtpInput
          onComplete={handleComplete}
          disabled={status === 'verifying' || status === 'success' || isPending}
          error={status === 'error'}
          resetSignal={resetSignal}
        />

        <AnimatePresence mode="wait">
          {status === 'error' && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 text-sm text-primary font-medium"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Acceso concedido</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-3 pt-2 border-t border-border">
        <ResendButton
          email={email}
          onResent={handleResent}
          onError={(msg) => setError(msg)}
        />

        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Cambiar correo</span>
        </Link>
      </div>
    </>
  );
}
