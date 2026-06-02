'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  /** Texto que se copia al portapapeles. */
  value: string;
  /** Etiqueta accesible del botón (qué se copia). */
  label?: string;
  className?: string;
}

/**
 * Botón pequeño que copia `value` al portapapeles y muestra un check
 * ("Copiado") por ~1.5s. Pensado para datos cortos (p.ej. la llave Bre-B).
 */
export function CopyButton({ value, label = 'Copiar', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // El portapapeles no está disponible (permisos / contexto no seguro);
      // no hacemos nada visible para no romper la experiencia.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Copiado' : `${label}: ${value}`}
      title={copied ? '¡Copiado!' : label}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md flex-shrink-0',
        'text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary',
        className,
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
