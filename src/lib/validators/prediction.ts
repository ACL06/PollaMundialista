import { z } from 'zod';

/**
 * Schemas Zod compartidos por server actions y validación cliente del
 * pronóstico. Mantener acá centralizado para que UI y BD coincidan.
 */

/**
 * Marcador predicho de un partido individual de fase de grupos.
 * Rango 0-30 alineado con el `check` constraint de la tabla.
 */
export const groupScoreSchema = z.object({
  match_id: z.string().uuid('match_id inválido'),
  home_score: z
    .number({ required_error: 'Marcador local requerido' })
    .int('Solo enteros')
    .min(0, 'Mínimo 0')
    .max(30, 'Máximo 30'),
  away_score: z
    .number({ required_error: 'Marcador visitante requerido' })
    .int('Solo enteros')
    .min(0, 'Mínimo 0')
    .max(30, 'Máximo 30'),
});

export type GroupScoreInput = z.infer<typeof groupScoreSchema>;
