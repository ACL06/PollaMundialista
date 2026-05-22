import { z } from 'zod';

export const WORLD_CUP_TEAMS = [
  { code: 'GER', name: 'Alemania', flag: 'DE' },
  { code: 'KSA', name: 'Arabia Saudita', flag: 'SA' },
  { code: 'ALG', name: 'Argelia', flag: 'DZ' },
  { code: 'ARG', name: 'Argentina', flag: 'AR' },
  { code: 'AUS', name: 'Australia', flag: 'AU' },
  { code: 'AUT', name: 'Austria', flag: 'AT' },
  { code: 'BEL', name: 'Bélgica', flag: 'BE' },
  { code: 'BIH', name: 'Bosnia y Herzegovina', flag: 'BA' },
  { code: 'BRA', name: 'Brasil', flag: 'BR' },
  { code: 'CPV', name: 'Cabo Verde', flag: 'CV' },
  { code: 'CAN', name: 'Canadá', flag: 'CA' },
  { code: 'COL', name: 'Colombia', flag: 'CO' },
  { code: 'KOR', name: 'Corea del Sur', flag: 'KR' },
  { code: 'CIV', name: 'Costa de Marfil', flag: 'CI' },
  { code: 'CRO', name: 'Croacia', flag: 'HR' },
  { code: 'CUW', name: 'Curaçao', flag: 'CW' },
  { code: 'COD', name: 'DR Congo', flag: 'CD' },
  { code: 'ECU', name: 'Ecuador', flag: 'EC' },
  { code: 'EGY', name: 'Egipto', flag: 'EG' },
  { code: 'SCO', name: 'Escocia', flag: 'GB-SCT' },
  { code: 'ESP', name: 'España', flag: 'ES' },
  { code: 'USA', name: 'Estados Unidos', flag: 'US' },
  { code: 'FRA', name: 'Francia', flag: 'FR' },
  { code: 'GHA', name: 'Ghana', flag: 'GH' },
  { code: 'HAI', name: 'Haití', flag: 'HT' },
  { code: 'ENG', name: 'Inglaterra', flag: 'GB-ENG' },
  { code: 'IRN', name: 'Irán', flag: 'IR' },
  { code: 'IRQ', name: 'Iraq', flag: 'IQ' },
  { code: 'JAM', name: 'Jamaica', flag: 'JM' },
  { code: 'JPN', name: 'Japón', flag: 'JP' },
  { code: 'JOR', name: 'Jordania', flag: 'JO' },
  { code: 'MAR', name: 'Marruecos', flag: 'MA' },
  { code: 'MEX', name: 'México', flag: 'MX' },
  { code: 'NOR', name: 'Noruega', flag: 'NO' },
  { code: 'NZL', name: 'Nueva Zelanda', flag: 'NZ' },
  { code: 'NED', name: 'Países Bajos', flag: 'NL' },
  { code: 'PAN', name: 'Panamá', flag: 'PA' },
  { code: 'PAR', name: 'Paraguay', flag: 'PY' },
  { code: 'POR', name: 'Portugal', flag: 'PT' },
  { code: 'QAT', name: 'Qatar', flag: 'QA' },
  { code: 'CZE', name: 'República Checa', flag: 'CZ' },
  { code: 'SEN', name: 'Senegal', flag: 'SN' },
  { code: 'RSA', name: 'Sudáfrica', flag: 'ZA' },
  { code: 'SWE', name: 'Suecia', flag: 'SE' },
  { code: 'SUI', name: 'Suiza', flag: 'CH' },
  { code: 'TUN', name: 'Túnez', flag: 'TN' },
  { code: 'TUR', name: 'Turquía', flag: 'TR' },
  { code: 'URU', name: 'Uruguay', flag: 'UY' },
  { code: 'UZB', name: 'Uzbekistán', flag: 'UZ' }
] as const;

export const profileSchema = z.object({
  nickname: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(20, 'Máximo 20 caracteres')
    .regex(/^[a-zA-Z0-9_.\-]+$/, 'Solo letras, números, puntos, guiones y guiones bajos')
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
