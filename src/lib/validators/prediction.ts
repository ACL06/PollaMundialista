import { z } from 'zod';

/**
 * Schemas Zod compartidos por server actions y validación cliente del
 * pronóstico. Mantener acá centralizado para que UI y BD coincidan.
 */

/**
 * Marcador predicho de un partido individual de fase de grupos.
 * Rango 0-99 alineado con el `check` constraint de la tabla.
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

const teamCode = z.string().regex(/^[A-Z]{2,4}$/, 'Código de equipo inválido');

/**
 * Campos "meta" del pronóstico (step Cierre): campeón, subcampeón,
 * tercer puesto, marcador exacto de la final (bonus) y goleador.
 *
 * Todos opcionales/nullable: el server solo persiste los campos que
 * llegan definidos (autosave parcial). `null` limpia el campo;
 * `undefined` lo deja como está.
 */
export const predictionMetaSchema = z.object({
  champion_code: teamCode.nullable().optional(),
  runner_up_code: teamCode.nullable().optional(),
  third_place_code: teamCode.nullable().optional(),
  final_home_score: z.number().int().min(0).max(99).nullable().optional(),
  final_away_score: z.number().int().min(0).max(99).nullable().optional(),
  top_scorer: z.string().max(80, 'Máximo 80 caracteres').nullable().optional(),
});

export type PredictionMetaInput = z.infer<typeof predictionMetaSchema>;
