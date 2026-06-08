/**
 * Formateo de fechas/horas en español colombiano, zona horaria Bogotá.
 * Diseñado para los partidos del Mundial — el usuario ve siempre en su TZ.
 */

const TZ = 'America/Bogota';
const LOCALE = 'es-CO';

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Ej: "Sábado 13 de junio · 2026"
 */
export function formatMatchDateLong(date: Date): string {
  const fmt = new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TZ,
  });
  const parts = fmt.formatToParts(date);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = new Intl.DateTimeFormat(LOCALE, { year: 'numeric', timeZone: TZ }).format(date);
  return `${cap(weekday)} ${day} de ${month} · ${year}`;
}

/**
 * Ej: "20:00"
 */
export function formatMatchTime(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ,
  }).format(date);
}

/**
 * Ej: "11 jun" (día + mes corto, TZ Bogotá). Para las etiquetas de los tabs
 * por día. IMPORTANTE: recibe la FECHA REAL del partido (`kicks_off_at`), no
 * la key `yyyy-MM-dd` — formatear `new Date(key)` la parsea como medianoche
 * UTC y, al re-localizar a Bogotá (UTC−5), corre la fecha un día atrás.
 */
export function formatMatchDateShort(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    timeZone: TZ,
  }).format(date);
}

/**
 * Clave estable yyyy-MM-dd en TZ Bogotá para agrupar partidos por día.
 */
export function formatMatchDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TZ,
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value ?? '';
  const m = parts.find((p) => p.type === 'month')?.value ?? '';
  const d = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${y}-${m}-${d}`;
}
