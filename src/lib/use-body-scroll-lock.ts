import { useEffect } from 'react';

/**
 * Bloquea el scroll del fondo (body) mientras `active` sea true, para que con
 * un modal abierto lo que está detrás no se mueva ("scroll bleed"). Restaura
 * el valor previo de overflow al cerrar/desmontar.
 *
 * Suficiente para web (desktop + mobile); no aplica el truco de
 * `position: fixed` de iOS Safari por simplicidad — si algún día molesta en
 * iOS, se puede ampliar acá sin tocar los modales.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
