import { Logo } from '@/components/shared/Logo';
import { EmailForm } from '@/components/auth/EmailForm';

export const metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
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

      <EmailForm />
    </>
  );
}
