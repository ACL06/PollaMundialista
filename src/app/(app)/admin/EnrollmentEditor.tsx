'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { displayName } from '@/lib/display-name';
import { setEnrollment } from './actions';

export interface EnrollmentUser {
  id: string;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_enrolled: boolean;
}

interface EnrollmentEditorProps {
  users: EnrollmentUser[];
}

/**
 * Administración de inscripciones: el admin marca quién ya pagó (inscrito)
 * y quién no (pre-inscrito). El pago es por un medio externo, así que esto
 * se administra a mano. Toggle optimista con revert si el server falla.
 */
export function EnrollmentEditor({ users }: EnrollmentEditorProps) {
  const [enrolled, setEnrolled] = useState<Map<string, boolean>>(
    () => new Map(users.map((u) => [u.id, u.is_enrolled])),
  );
  const [errorId, setErrorId] = useState<string | null>(null);
  const [, startSave] = useTransition();

  const enrolledCount = useMemo(
    () => Array.from(enrolled.values()).filter(Boolean).length,
    [enrolled],
  );

  const toggle = (userId: string) => {
    const next = !(enrolled.get(userId) ?? false);
    setEnrolled((prev) => new Map(prev).set(userId, next));
    setErrorId(null);
    startSave(async () => {
      const res = await setEnrollment({ userId, enrolled: next });
      if (res.error) {
        // Revertir
        setEnrolled((prev) => new Map(prev).set(userId, !next));
        setErrorId(userId);
      }
    });
  };

  // Pre-inscritos primero (lo que el admin suele necesitar atender).
  const sorted = useMemo(
    () =>
      [...users].sort((a, b) => {
        const ae = enrolled.get(a.id) ? 1 : 0;
        const be = enrolled.get(b.id) ? 1 : 0;
        if (ae !== be) return ae - be;
        return displayName(a).localeCompare(displayName(b));
      }),
    [users, enrolled],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Inscripciones
        </h2>
        <span className="text-sm font-medium text-foreground tabular-nums">
          {enrolledCount}/{users.length} inscritos
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Marca <span className="font-medium text-foreground">Inscrito</span> cuando confirmes el
        pago del usuario por el medio externo. Los demás quedan como pre-inscritos.
      </p>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Todavía no hay usuarios registrados.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((u) => {
            const isOn = enrolled.get(u.id) ?? false;
            const hasError = errorId === u.id;
            return (
              <li
                key={u.id}
                className={cn(
                  'flex items-center gap-3 border rounded-lg px-3 py-2.5',
                  hasError ? 'border-destructive bg-destructive/5' : 'border-border bg-surface',
                )}
              >
                <Avatar avatarUrl={u.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{displayName(u)}</p>
                  {u.nickname && (
                    <p className="text-xs text-muted-foreground truncate">@{u.nickname}</p>
                  )}
                  {hasError && (
                    <p className="flex items-center gap-1 text-[12px] text-destructive" role="alert">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      No se pudo guardar. Reintenta.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggle(u.id)}
                  aria-pressed={isOn}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex-shrink-0',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
                    isOn
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-destructive/40 bg-destructive/5 text-destructive',
                  )}
                >
                  {isOn ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Inscrito
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5" />
                      Pre-inscrito
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Avatar({ avatarUrl }: { avatarUrl: string | null }) {
  if (!avatarUrl) {
    return <span className="h-9 w-9 rounded-full bg-muted flex-shrink-0" aria-hidden="true" />;
  }
  return (
    <Image
      src={avatarUrl}
      alt=""
      width={36}
      height={36}
      unoptimized
      className="rounded-full bg-muted flex-shrink-0"
    />
  );
}
