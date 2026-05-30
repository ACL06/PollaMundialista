import { describe, it, expect } from 'vitest';
import { profileUpdateSchema } from './profile';

const valid = {
  first_name: 'Álvaro',
  last_name: 'Castaño',
  phone: '3001234567',
  nickname: 'ElProfe10',
};

describe('profileUpdateSchema', () => {
  it('acepta datos válidos y hace trim de los nombres', () => {
    const r = profileUpdateSchema.safeParse({ ...valid, first_name: '  Álvaro  ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.first_name).toBe('Álvaro');
  });

  it('rechaza nombre de solo espacios (regresión del bug de bypass)', () => {
    expect(profileUpdateSchema.safeParse({ ...valid, first_name: '   ' }).success).toBe(false);
  });

  it('acepta acentos y ñ; rechaza números y símbolos en nombres', () => {
    expect(profileUpdateSchema.safeParse({ ...valid, first_name: 'María José' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ ...valid, last_name: 'Muñoz' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ ...valid, first_name: 'Alvaro2' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ ...valid, last_name: "O'Brien" }).success).toBe(false);
  });

  it('celular: 10 dígitos empezando por 3', () => {
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '3001234567' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '2001234567' }).success).toBe(false); // no empieza por 3
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '300123456' }).success).toBe(false); // 9 dígitos
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '30012345678' }).success).toBe(false); // 11
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '300123456a' }).success).toBe(false); // letra
  });

  it('nickname: 3-20, solo letras/números/._-', () => {
    expect(profileUpdateSchema.safeParse({ ...valid, nickname: 'ab' }).success).toBe(false); // < 3
    expect(profileUpdateSchema.safeParse({ ...valid, nickname: 'con espacio' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ ...valid, nickname: 'a.b_c-1' }).success).toBe(true);
  });
});
