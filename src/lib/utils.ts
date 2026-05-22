import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classNames con tailwind-merge para evitar conflictos
 * de clases utilitarias de Tailwind.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Enmascara un email para mostrar en UI (ej: t***@correo.com)
 */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const visible = name.slice(0, 1);
  const masked = '*'.repeat(Math.max(3, name.length - 1));
  return `${visible}${masked}@${domain}`;
}
