'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BREB_HOLDER, BREB_KEY, WHATSAPP_GROUP_URL } from '@/lib/prizes';

const STORAGE_KEY = 'polla:enrollmentReminder';
/** Cuántos días antes del arranque se empieza a recordar. */
const REMIND_WINDOW_DAYS = 5;

/** Fecha de hoy (Bogotá) como YYYY-MM-DD, para el control "1 vez al día". */
function todayKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

interface EnrollmentReminderModalProps {
  /** ISO del arranque (lock global). Si es null, no se recuerda. */
  lockAtIso: string | null;
}

/**
 * Recordatorio para usuarios PRE-INSCRITOS: en los últimos 5 días antes del
 * arranque del Mundial, al entrar a cualquier sección se muestra una vez al
 * día (control por `localStorage`). Si no se inscriben antes del partido
 * inaugural, pierden el acceso (gate en el AppLayout). Solo se monta cuando
 * el usuario es pre-inscrito y el torneo aún no arranca.
 */
export function EnrollmentReminderModal({ lockAtIso }: EnrollmentReminderModalProps) {
  const [open, setOpen] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    if (!lockAtIso) return;
    const msLeft = new Date(lockAtIso).getTime() - Date.now();
    const days = msLeft / 86_400_000;
    if (days <= 0 || days > REMIND_WINDOW_DAYS) return; // solo en la ventana
    try {
      if (localStorage.getItem(STORAGE_KEY) === todayKey()) return; // ya hoy
      localStorage.setItem(STORAGE_KEY, todayKey());
    } catch {
      // localStorage no disponible → mostramos igual (sin dedup).
    }
    setDaysLeft(Math.max(1, Math.ceil(days)));
    setOpen(true);
  }, [lockAtIso]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enroll-reminder-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h2 id="enroll-reminder-title" className="text-lg font-bold text-foreground">
              ¡Falta tu inscripción!
            </h2>
          </div>

          <p className="text-sm text-muted-foreground">
            Todavía estás <span className="font-semibold text-destructive">pre-inscrito</span>.
            {daysLeft === 1
              ? ' El Mundial arranca mañana.'
              : ` Faltan ${daysLeft} días para el arranque.`}{' '}
            Si no estás inscrito cuando empiece el partido inaugural,{' '}
            <span className="font-medium text-foreground">perderás el acceso a la plataforma</span>.
          </p>

          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <p className="mb-1 text-muted-foreground">Consigna a la llave Bre-B y avisa al admin:</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Llave Bre-B</span>
              <span className="font-semibold text-foreground">{BREB_KEY}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">A nombre de</span>
              <span className="font-medium text-foreground">{BREB_HOLDER}</span>
            </div>
          </div>

          <a
            href={WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold',
              'bg-primary text-primary-foreground hover:brightness-110 transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
            )}
          >
            <MessageCircle className="h-4 w-4" />
            Escribir al grupo de WhatsApp
          </a>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
