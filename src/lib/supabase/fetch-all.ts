import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Tamaño de página al paginar. Coincide con el "Max Rows" histórico de
 * PostgREST (1.000): aunque el proyecto hoy tiene el límite en 10.000, el
 * helper pagina de a 1.000 para funcionar correcto con CUALQUIER config.
 */
export const FETCH_ALL_PAGE_SIZE = 1000;

interface PageResult<Row> {
  data: Row[] | null;
  error: PostgrestError | null;
}

/** Query de supabase-js re-ejecutable con `.range()` (thenable). */
type RangeableQuery<Row> = {
  range(from: number, to: number): PromiseLike<PageResult<Row>>;
};

/**
 * Trae TODAS las filas de una consulta paginando con `.range()`.
 *
 * PostgREST corta silenciosamente cualquier respuesta al "Max Rows" del
 * proyecto (default 1.000) — sin error y sin aviso. Las lecturas globales
 * (ranking, comunidad) superan ese tope con los ~34 inscritos × 72 marcadores,
 * así que se paginan acá. (Bug del 11/jun/2026: Comunidad mostraba ~19
 * pronósticos por partido y el ranking habría contado la mitad de los puntos.)
 *
 * IMPORTANTE: la consulta DEBE llevar `.order()` determinista (típicamente la
 * PK completa); sin orden estable las páginas pueden solaparse o saltarse filas.
 *
 * Recibe una factory (no el builder) porque cada página necesita una query
 * fresca. Devuelve `{ data, error }` con la misma forma que supabase-js:
 * si una página falla, `data` es null (nunca un parcial silencioso).
 */
export async function fetchAll<Row>(
  buildQuery: () => RangeableQuery<Row>,
): Promise<PageResult<Row>> {
  const rows: Row[] = [];
  for (let from = 0; ; from += FETCH_ALL_PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + FETCH_ALL_PAGE_SIZE - 1);
    if (error) return { data: null, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < FETCH_ALL_PAGE_SIZE) break; // última página
  }
  return { data: rows, error: null };
}
