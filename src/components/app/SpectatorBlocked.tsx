import Link from 'next/link';
import { CalendarDays, ListOrdered, Lock } from 'lucide-react';

/**
 * Pantalla para las secciones de la polla (pronósticos, comunidad, ranking)
 * cuando las ve un usuario en "modo espectador" (post-lock, no inscrito). La
 * info del Mundial sí está disponible, así que lo guiamos a calendario/grupos.
 */
export function SpectatorBlocked() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-5 px-5 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Inscripciones cerradas</h1>
        <p className="text-muted-foreground">
          Esta sección es solo para participantes inscritos. El Mundial ya arrancó, pero puedes
          seguir el torneo desde el calendario y la fase de grupos.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/calendar"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
        >
          <CalendarDays className="h-4 w-4" />
          Ver calendario
        </Link>
        <Link
          href="/grupos"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
        >
          <ListOrdered className="h-4 w-4" />
          Fase de grupos
        </Link>
      </div>
    </div>
  );
}
