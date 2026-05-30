import { describe, it, expect } from 'vitest';
import { isLockedAt } from './predictions-lock';

describe('isLockedAt', () => {
  const lock = new Date('2026-06-11T19:00:00Z');

  it('lockAt null → nunca bloqueado', () => {
    expect(isLockedAt(null, new Date('2030-01-01T00:00:00Z'))).toBe(false);
  });

  it('antes del lock → no bloqueado', () => {
    expect(isLockedAt(lock, new Date('2026-06-11T18:59:59Z'))).toBe(false);
  });

  it('en el instante exacto del lock → bloqueado (>=)', () => {
    expect(isLockedAt(lock, new Date('2026-06-11T19:00:00Z'))).toBe(true);
  });

  it('después del lock → bloqueado', () => {
    expect(isLockedAt(lock, new Date('2026-06-11T19:00:01Z'))).toBe(true);
  });
});
