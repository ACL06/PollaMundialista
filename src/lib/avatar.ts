export function getAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Genera N variantes de avatar para que el usuario elija.
 * El set NO depende del nickname (así no cambia mientras el usuario escribe);
 * solo cambia con `generation`: el botón "Otras opciones" sube el contador y
 * produce un set completamente nuevo.
 */
export function getAvatarVariants(generation: number, count = 6): string[] {
  return Array.from({ length: count }, (_, i) => getAvatarUrl(`polla-g${generation}-${i}`));
}
