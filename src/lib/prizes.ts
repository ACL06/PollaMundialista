/**
 * Configuración de inscripción y premios de la polla (Fase 10).
 * Valores que pueden cambiar — centralizados aquí para editarlos en un solo
 * lugar. Montos en pesos colombianos (COP).
 */

/** Costo de inscripción por participante (COP). Puede cambiar. */
export const ENROLLMENT_COST_COP = 50000;

/** Porcentaje del monto acumulado que va a la administración de la polla. */
export const ADMIN_CUT = 0.1;

/** Reparto del pozo de premios (tras quitar la administración): 1° / 2° / 3°. */
export const PODIUM_SPLIT = [0.7, 0.2, 0.1] as const;

/** Link de invitación al grupo de WhatsApp de la polla. Placeholder — reemplazar. */
export const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/XXXXXXXXXXXXXXXXX';

/** Datos para consignar la inscripción vía Bre-B (editables acá). */
export const BREB_KEY = '@alvaro320';
export const BREB_HOLDER = 'Álvaro Castaño López';

export interface PrizeBreakdown {
  /** Monto acumulado = inscritos × costo. */
  pot: number;
  /** Parte para la administración de la polla (10%). */
  adminCut: number;
  /** Monto para premios que se reparte en el podio (90%). */
  prizePool: number;
  /** Premio de cada puesto del podio [1°, 2°, 3°]. */
  podium: [number, number, number];
}

/**
 * Calcula el reparto de premios según la cantidad de inscritos.
 * El 1.er puesto absorbe el redondeo para que el podio sume exactamente
 * el monto de premios.
 */
export function computePrizes(enrolledCount: number): PrizeBreakdown {
  const pot = Math.max(0, Math.trunc(enrolledCount)) * ENROLLMENT_COST_COP;
  const adminCut = Math.round(pot * ADMIN_CUT);
  const prizePool = pot - adminCut;
  const second = Math.round(prizePool * PODIUM_SPLIT[1]);
  const third = Math.round(prizePool * PODIUM_SPLIT[2]);
  const first = prizePool - second - third;
  return { pot, adminCut, prizePool, podium: [first, second, third] };
}

/** Formatea un monto en COP sin decimales: 50000 → "$50.000". */
export function formatCOP(n: number): string {
  return n.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}
