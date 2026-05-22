import { Logo } from '@/components/shared/Logo';
import { EmailForm } from '@/components/auth/EmailForm';
import { AlertTriangle } from 'lucide-react';

export const metadata = { title: 'Iniciar sesión' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const blockedByOtp = reason === 'otp_blocked';

  return (
    <>
      <div className="flex flex-col items-center text-center space-y-3">
        <Logo variant="full" width={240} height={60} />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
            Polla Mundialista
          </h1>
          <p className="text-sm text-muted-foreground">
            Inicia sesión para participar
          </p>
        </div>
      </div>

      {blockedByOtp && (
        <div
          role="alert"
          className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Demasiados intentos fallidos. Solicita un nuevo código ingresando tu correo.
          </span>
        </div>
      )}

      <EmailForm />
    </>
  );
}
