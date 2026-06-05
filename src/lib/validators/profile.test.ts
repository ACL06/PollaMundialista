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

  it('celular: solo dígitos, 7 a 15, cualquier país', () => {
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '3001234567' }).success).toBe(true); // CO 10 díg
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '2001234567' }).success).toBe(true); // ya no exige empezar por 3
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '12025550123' }).success).toBe(true); // 11 díg (+1 USA)
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '1234567' }).success).toBe(true); // 7 díg (mínimo)
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '123456789012345' }).success).toBe(true); // 15 díg (máximo E.164)
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '123456' }).success).toBe(false); // 6 < 7
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '1234567890123456' }).success).toBe(false); // 16 > 15
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '300 123 4567' }).success).toBe(false); // espacios
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '300-123-4567' }).success).toBe(false); // símbolos
    expect(profileUpdateSchema.safeParse({ ...valid, phone: '300123456a' }).success).toBe(false); // letra
  });

  it('nickname: 3-20, solo letras/números/._-', () => {
    expect(profileUpdateSchema.safeParse({ ...valid, nickname: 'ab' }).success).toBe(false); // < 3
    expect(profileUpdateSchema.safeParse({ ...valid, nickname: 'con espacio' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ ...valid, nickname: 'a.b_c-1' }).success).toBe(true);
  });

  it('nickname: admite ñ/Ñ y acentos (letras Unicode)', () => {
    expect(profileUpdateSchema.safeParse({ ...valid, nickname: 'Toño' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ ...valid, nickname: 'Ñoño10' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ ...valid, nickname: 'José_99' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ ...valid, nickname: 'crack@7' }).success).toBe(false); // @ no
  });
});
