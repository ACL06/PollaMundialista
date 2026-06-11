/**
 * Loading UI del grupo (app) — App Router la muestra AL INSTANTE al navegar
 * a cualquier sección mientras el server arma la página. El header y el
 * TabNav del layout quedan visibles e interactivos; solo el contenido se
 * reemplaza por este esqueleto. Sin esto, la navegación se sentía congelada
 * en la página anterior hasta llegar el RSC completo (notorio en Comunidad,
 * la página con más datos).
 */
export default function AppLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-6"
    >
      <span className="sr-only">Cargando…</span>

      {/* Título + subtítulo */}
      <div className="space-y-2.5">
        <div className="h-8 w-44 rounded-lg bg-muted animate-pulse motion-reduce:animate-none" />
        <div className="h-4 w-72 max-w-full rounded bg-muted animate-pulse motion-reduce:animate-none" />
      </div>

      {/* Tarjetas de contenido */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 rounded-xl border border-border bg-muted/60 animate-pulse motion-reduce:animate-none"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}
