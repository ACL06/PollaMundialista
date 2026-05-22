export function getAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Genera N variantes de avatar para el nickname.
 * Cada variante usa un seed distinto basado en el nickname + número de generación.
 * Cambiar `generation` produce un set completamente nuevo de avatares.
 */
export function getAvatarVariants(nickname: string, generation: number, count = 6): string[] {
  const trimmed = nickname.trim();
  const baseSeed = trimmed.length >= 2 ? trimmed : 'default';
  return Array.from({ length: count }, (_, i) =>
    getAvatarUrl(`${baseSeed}-g${generation}-${i}`),
  );
}
