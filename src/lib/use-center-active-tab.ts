import { useEffect, useRef } from 'react';

/**
 * Mantiene centrado el tab/botón activo dentro de un contenedor con scroll
 * horizontal. Sirve para barras de pestañas scrolleables (navbar principal,
 * filtros del calendario, rondas del bracket, días de marcadores): al centrar
 * el activo se nota que hay más opciones a los lados.
 *
 * Calcula el offset con `getBoundingClientRect` (no `offsetLeft`, que es
 * relativo al offsetParent y se iba hasta el final) y scrollea solo el
 * contenedor, sin mover el scroll de la página.
 *
 * Uso:
 *   const { containerRef, activeRef } = useCenterActiveTab<HTMLButtonElement>(activeKey);
 *   <div ref={containerRef} className="overflow-x-auto">
 *     {items.map(it => <button ref={it.key === activeKey ? activeRef : undefined} />)}
 *   </div>
 */
export function useCenterActiveTab<T extends HTMLElement>(activeKey: unknown) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    const active = activeRef.current;
    if (!container || !active) return;
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const offsetWithin = activeRect.left - containerRect.left + container.scrollLeft;
    const target = offsetWithin - (container.clientWidth - active.clientWidth) / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [activeKey]);

  return { containerRef, activeRef };
}
