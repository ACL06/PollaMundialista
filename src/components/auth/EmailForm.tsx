'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { sendOtp } from '@/app/(auth)/login/actions';
import { emailSchema } from '@/lib/validators/auth';

export function EmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Correo inválido');
      return;
    }

    startTransition(async () => {
      const result = await sendOtp(parsed.data.email);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/verify?email=${encodeURIComponent(parsed.data.email)}`);
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      className="w-full space-y-4"
      noValidate
    >
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Ingresa tu correo electrónico
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="ejemplo@correo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            error={!!error}
            disabled={isPending}
            className="pl-10"
            required
          />
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      <Button type="submit" size="lg" fullWidth loading={isPending} disabled={!email}>
        Enviar código OTP
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Te enviaremos un código de 6 dígitos a tu correo
      </p>
    </motion.form>
  );
}
