import { describe, it, expect } from 'vitest';
import { fetchAll, FETCH_ALL_PAGE_SIZE } from './fetch-all';
import type { PostgrestError } from '@supabase/supabase-js';

interface Row {
  i: number;
}

/**
 * Simula el comportamiento de PostgREST: cada query nueva responde el slice
 * pedido por `.range(from, to)`. `failAtCall` hace fallar la N-ésima página.
 */
function fakeQueryFactory(total: number, opts?: { failAtCall?: number }) {
  const all: Row[] = Array.from({ length: total }, (_, i) => ({ i }));
  let calls = 0;
  const factory = () => ({
    range(from: number, to: number) {
      calls += 1;
      if (opts?.failAtCall === calls) {
        return Promise.resolve({
          data: null,
          error: { message: 'boom' } as PostgrestError,
        });
      }
      return Promise.resolve({ data: all.slice(from, to + 1), error: null });
    },
  });
  return { factory, callCount: () => calls };
}

describe('fetchAll', () => {
  it('una sola página cuando hay menos filas que el tamaño de página', async () => {
    const { factory, callCount } = fakeQueryFactory(37);
    const { data, error } = await fetchAll<Row>(factory);
    expect(error).toBeNull();
    expect(data).toHaveLength(37);
    expect(callCount()).toBe(1);
  });

  it('concatena varias páginas sin perder ni duplicar filas', async () => {
    const total = FETCH_ALL_PAGE_SIZE * 2 + 448; // ~2448: el caso real (34×72)
    const { factory, callCount } = fakeQueryFactory(total);
    const { data, error } = await fetchAll<Row>(factory);
    expect(error).toBeNull();
    expect(data).toHaveLength(total);
    expect(new Set(data!.map((r) => r.i)).size).toBe(total); // sin duplicados
    expect(data![total - 1]).toEqual({ i: total - 1 }); // orden preservado
    expect(callCount()).toBe(3);
  });

  it('total múltiplo exacto del tamaño de página → pide una página extra vacía', async () => {
    const total = FETCH_ALL_PAGE_SIZE * 2;
    const { factory, callCount } = fakeQueryFactory(total);
    const { data } = await fetchAll<Row>(factory);
    expect(data).toHaveLength(total);
    expect(callCount()).toBe(3); // 1000 + 1000 + 0
  });

  it('cero filas → data vacío, sin error', async () => {
    const { factory } = fakeQueryFactory(0);
    const { data, error } = await fetchAll<Row>(factory);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('si una página falla devuelve error y data null (nunca un parcial silencioso)', async () => {
    const { factory } = fakeQueryFactory(FETCH_ALL_PAGE_SIZE * 3, { failAtCall: 2 });
    const { data, error } = await fetchAll<Row>(factory);
    expect(error?.message).toBe('boom');
    expect(data).toBeNull();
  });
});
