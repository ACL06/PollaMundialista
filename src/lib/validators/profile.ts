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
