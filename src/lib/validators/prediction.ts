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
    .max(99, 'Máximo 99'),
  away_score: z
    .number({ required_error: 'Marcador visitante requerido' })
    .int('Solo enteros')
    .min(0, 'Mínimo 0')
    .max(99, 'Máximo 99'),
});

export type GroupScoreInput = z.infer<typeof groupScoreSchema>;

/**
 * Toggle de un equipo en una ronda del bracket eliminatorio.
 * `selected: true` agrega; `false` quita (y el server hace cascada a
 * las rondas posteriores).
 */
export const bracketToggleSchema = z.object({
  round: z.enum(['r32', 'r16', 'qf', 'sf']),
  team_code: z.string().regex(/^[A-Z]{2,4}$/, 'Código de equipo inválido'),
  selected: z.boolean(),
});

export type BracketToggleInput = z.infer<typeof bracketToggleSchema>;
