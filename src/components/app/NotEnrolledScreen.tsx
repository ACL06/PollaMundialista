import { Lock, MessageCircle } from 'lucide-react';
import { WHATSAPP_GROUP_URL } from '@/lib/prizes';
import { LogoutButton } from '@/app/(app)/LogoutButton';

/**
 * Pantalla que ve un usuario PRE-INSCRITO una vez que el Mundial arrancó: no
 * completó su inscripción a tiempo, así que pierde el acceso a la plataforma.
 * Reemplaza el contenido del AppLayout para todas las rutas privadas.
 */
export function NotEnrolledScreen() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-5 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <Lock className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-bold text-foreground">No completaste tu inscripción</h1>
        <p className="text-muted-foreground">
          El Mundial ya arrancó y no quedaste inscrito, así que no puedes participar en la polla. Si
          ya pagaste o crees que es un error, escríbenos y lo revisamos.
        </p>
      </div>
      <a
        href={WHATSAPP_GROUP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
      >
        <MessageCircle className="h-4 w-4" />
        Escribir al grupo de WhatsApp
      </a>
      <LogoutButton />
    </div>
  );
}
