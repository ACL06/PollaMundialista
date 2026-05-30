/**
 * Footer global que aparece en todas las vistas de la app (autenticadas
 * y públicas). Es solo un crédito de autoría — sin links, sin
 * navegación, sin dependencias.
 */
export function Footer() {
  return (
    <footer className="border-t border-border py-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <p className="text-xs text-muted-foreground text-center">
          By Álvaro Castaño
        </p>
      </div>
    </footer>
  );
}
