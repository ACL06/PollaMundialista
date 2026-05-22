import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-gradient min-h-screen flex flex-col">
      <header className="flex justify-end p-4 sm:p-6">
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="bg-surface/80 backdrop-blur-sm border border-border rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
            {children}
          </div>

          <footer className="mt-6 text-center text-xs text-muted-foreground px-4">
            Polla Mundialista es un proyecto independiente y no está afiliado, patrocinado ni
            avalado por FIFA ni por ninguna federación oficial.
          </footer>
        </div>
      </main>
    </div>
  );
}
