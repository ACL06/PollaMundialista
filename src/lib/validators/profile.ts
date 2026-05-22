import { z } from 'zod';

export const WORLD_CUP_TEAMS = [
  { code: 'GER', name: 'Alemania', flag: '🇩🇪' },
  { code: 'SAU', name: 'Arabia Saudita', flag: '🇸🇦' },
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AUS', name: 'Australia', flag: '🇦🇺' },
  { code: 'AUT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BEL', name: 'Bélgica', flag: '🇧🇪' },
  { code: 'BOL', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'BRA', name: 'Brasil', flag: '🇧🇷' },
  { code: 'CMR', name: 'Camerún', flag: '🇨🇲' },
  { code: 'CAN', name: 'Canadá', flag: '🇨🇦' },
  { code: 'CHI', name: 'Chile', flag: '🇨🇱' },
  { code: 'COL', name: 'Colombia', flag: '🇨🇴' },
  { code: 'KOR', name: 'Corea del Sur', flag: '🇰🇷' },
  { code: 'CRC', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'CRO', name: 'Croacia', flag: '🇭🇷' },
  { code: 'DEN', name: 'Dinamarca', flag: '🇩🇰' },
  { code: 'ECU', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'EGY', name: 'Egipto', flag: '🇪🇬' },
  { code: 'SCO', name: 'Escocia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { code: 'ESP', name: 'España', flag: '🇪🇸' },
  { code: 'USA', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'FRA', name: 'Francia', flag: '🇫🇷' },
  { code: 'GHA', name: 'Ghana', flag: '🇬🇭' },
  { code: 'HON', name: 'Honduras', flag: '🇭🇳' },
  { code: 'ENG', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'IRN', name: 'Irán', flag: '🇮🇷' },
  { code: 'ITA', name: 'Italia', flag: '🇮🇹' },
  { code: 'JAM', name: 'Jamaica', flag: '🇯🇲' },
  { code: 'JPN', name: 'Japón', flag: '🇯🇵' },
  { code: 'MAR', name: 'Marruecos', flag: '🇲🇦' },
  { code: 'MEX', name: 'México', flag: '🇲🇽' },
  { code: 'NGA', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'NED', name: 'Países Bajos', flag: '🇳🇱' },
  { code: 'PAN', name: 'Panamá', flag: '🇵🇦' },
  { code: 'PAR', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'PER', name: 'Perú', flag: '🇵🇪' },
  { code: 'POL', name: 'Polonia', flag: '🇵🇱' },
  { code: 'POR', name: 'Portugal', flag: '🇵🇹' },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'SUI', name: 'Suiza', flag: '🇨🇭' },
  { code: 'TUN', name: 'Túnez', flag: '🇹🇳' },
  { code: 'TUR', name: 'Turquía', flag: '🇹🇷' },
  { code: 'URU', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'VEN', name: 'Venezuela', flag: '🇻🇪' },
] as const;

export type TeamCode = (typeof WORLD_CUP_TEAMS)[number]['code'];

export const profileSchema = z.object({
  nickname: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(20, 'Máximo 20 caracteres')
    .regex(/^[a-zA-Z0-9_.\-]+$/, 'Solo letras, números, puntos, guiones y guiones bajos')
    .transform((v) => v.trim()),
  favorite_team: z.string().nullable().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
