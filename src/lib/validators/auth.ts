import { z } from 'zod';

export const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'Ingresa tu correo electrónico')
    .email('Correo electrónico inválido')
    .max(254, 'El correo es demasiado largo')
    .transform((v) => v.toLowerCase().trim()),
});

export const otpSchema = z.object({
  email: z.string().email(),
  token: z
    .string()
    .length(6, 'El código debe tener 6 dígitos')
    .regex(/^\d{6}$/, 'El código solo puede contener números'),
});

export type EmailInput = z.infer<typeof emailSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
