import { z } from 'zod';

export const WORLD_CUP_TEAMS = [
  { code: 'GER', name: 'Alemania', flag: 'de' },
  { code: 'KSA', name: 'Arabia Saudita', flag: 'sa' },
  { code: 'ALG', name: 'Argelia', flag: 'dz' },
  { code: 'ARG', name: 'Argentina', flag: 'ar' },
  { code: 'AUS', name: 'Australia', flag: 'au' },
  { code: 'AUT', name: 'Austria', flag: 'at' },
  { code: 'BEL', name: 'Bélgica', flag: 'be' },
  { code: 'BIH', name: 'Bosnia y Herzegovina', flag: 'ba' },
  { code: 'BRA', name: 'Brasil', flag: 'br' },
  { code: 'CPV', name: 'Cabo Verde', flag: 'cv' },
  { code: 'CAN', name: 'Canadá', flag: 'ca' },
  { code: 'COL', name: 'Colombia', flag: 'co' },
  { code: 'KOR', name: 'Corea del Sur', flag: 'kr' },
  { code: 'CIV', name: 'Costa de Marfil', flag: 'ci' },
  { code: 'CRO', name: 'Croacia', flag: 'hr' },
  { code: 'CUW', name: 'Curaçao', flag: 'cw' },
  { code: 'COD', name: 'DR Congo', flag: 'cd' },
  { code: 'ECU', name: 'Ecuador', flag: 'ec' },
  { code: 'EGY', name: 'Egipto', flag: 'eg' },
  { code: 'SCO', name: 'Escocia', flag: 'gb-sct' },
  { code: 'ESP', name: 'España', flag: 'es' },
  { code: 'USA', name: 'Estados Unidos', flag: 'us' },
  { code: 'FRA', name: 'Francia', flag: 'fr' },
  { code: 'GHA', name: 'Ghana', flag: 'gh' },
  { code: 'HAI', name: 'Haití', flag: 'ht' },
  { code: 'ENG', name: 'Inglaterra', flag: 'gb-eng' },
  { code: 'IRN', name: 'Irán', flag: 'ir' },
  { code: 'IRQ', name: 'Iraq', flag: 'iq' },
  { code: 'JAM', name: 'Jamaica', flag: 'jm' },
  { code: 'JPN', name: 'Japón', flag: 'jp' },
  { code: 'JOR', name: 'Jordania', flag: 'jo' },
  { code: 'MAR', name: 'Marruecos', flag: 'ma' },
  { code: 'MEX', name: 'México', flag: 'mx' },
  { code: 'NOR', name: 'Noruega', flag: 'no' },
  { code: 'NZL', name: 'Nueva Zelanda', flag: 'nz' },
  { code: 'NED', name: 'Países Bajos', flag: 'nl' },
  { code: 'PAN', name: 'Panamá', flag: 'pa' },
  { code: 'PAR', name: 'Paraguay', flag: 'py' },
  { code: 'POR', name: 'Portugal', flag: 'pt' },
  { code: 'QAT', name: 'Qatar', flag: 'qa' },
  { code: 'CZE', name: 'República Checa', flag: 'cz' },
  { code: 'SEN', name: 'Senegal', flag: 'sn' },
  { code: 'RSA', name: 'Sudáfrica', flag: 'za' },
  { code: 'SWE', name: 'Suecia', flag: 'se' },
  { code: 'SUI', name: 'Suiza', flag: 'ch' },
  { code: 'TUN', name: 'Túnez', flag: 'tn' },
  { code: 'TUR', name: 'Turquía', flag: 'tr' },
  { code: 'URU', name: 'Uruguay', flag: 'uy' },
  { code: 'UZB', name: 'Uzbekistán', flag: 'uz' }
] as const;

// Nombres y apellidos: solo letras Unicode (incluye acentos y ñ) y espacios.
// Explícitamente NO se permiten números, guiones, apóstrofes ni otros símbolos.
// Exportado porque el form también lo usa para validación inline en vivo.
export const NAME_REGEX = /^[\p{L}\s]+$/u;
// Celular: solo dígitos (sin espacios ni símbolos), de 7 a 15. Admite números
// de cualquier país (no solo Colombia, que empieza por 3); 15 = máximo del
// estándar internacional E.164. Exportado para que los forms validen inline
// con la misma regla que el server.
export const PHONE_REGEX = /^\d{7,15}$/;
const PHONE_ERROR = 'Celular: solo números, entre 7 y 15 dígitos, sin espacios ni símbolos';
// Nickname: letras Unicode (incluye ñ/Ñ y acentos), números, punto, guion y guion bajo.
// Exportados para que el form valide inline con la misma regla que el server.
export const NICKNAME_REGEX = /^[\p{L}0-9._-]+$/u;
export const NICKNAME_ERROR = 'Nickname: solo letras, números, puntos, guiones y guiones bajos';

// Helper para campos de nombre: trim primero, luego validar largo y regex.
// Recibe la etiqueta ("Nombre"/"Apellidos") para que el mensaje diga DE QUÉ
// campo se trata. Sin el trim previo, alguien escribiendo "  " (solo espacios)
// pasaba el min(2) y se guardaba como "" tras el .transform — bypass + bucle
// de redirect en AppLayout porque "" es falsy. El `pipe` aplica las reglas
// sobre el valor ya transformado.
const nameField = (label: string) =>
  z
    .string()
    .max(50, `${label}: máximo 50 caracteres`)
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .min(2, `${label}: mínimo 2 caracteres`)
        .regex(NAME_REGEX, `${label}: solo letras y espacios, sin números ni símbolos`),
    );

export const profileSchema = z.object({
  first_name: nameField('Nombre'),
  last_name: nameField('Apellidos'),
  phone: z.string().regex(PHONE_REGEX, PHONE_ERROR),
  nickname: z
    .string()
    .min(3, 'Nickname: mínimo 3 caracteres')
    .max(20, 'Nickname: máximo 20 caracteres')
    .regex(NICKNAME_REGEX, NICKNAME_ERROR)
    .transform((v) => v.trim()),
  favorite_team: z.string().nullable().optional(),
  // Validación estricta: solo URLs de DiceBear con estructura conocida
  // (versión major.minor + style + /svg + query string)
  avatar_url: z
    .string()
    .regex(
      /^https:\/\/api\.dicebear\.com\/\d+\.x\/[a-z0-9-]+\/svg\?.+$/,
      'Avatar inválido',
    )
    .optional(),
});

/**
 * Schema para editar el perfil desde el modal del header: los datos
 * modificables (el email no se toca). Reusa las mismas reglas de
 * `profileSchema` vía `.pick()` — incluye avatar y equipo favorito.
 */
export const profileUpdateSchema = profileSchema.pick({
  first_name: true,
  last_name: true,
  phone: true,
  nickname: true,
  favorite_team: true,
  avatar_url: true,
});

/**
 * Reduce un ZodError a un mapa { campo: primer mensaje } para que el form
 * marque y muestre el error en el input correspondiente (ser específicos en
 * vez de un único mensaje genérico al pie).
 */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in out)) out[key] = issue.message;
  }
  return out;
}
