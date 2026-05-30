import { Construction } from 'lucide-react';

interface PlaceholderStepProps {
  stepName: string;
  /** Sub-fase de la roadmap que entregará este step (4B.2, 4B.3, etc.). */
  comingIn: string;
}

/**
 * Stub para los steps del wizard que aún no están implementados. La
 * estructura del wizard ya existe (Fase 4B.1) pero cada step funcional
 * llega en su propio sub-PR para mantener el diff manejable.
 */
export function PlaceholderStep({ stepName, comingIn }: PlaceholderStepProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Construction className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-semibold text-foreground">{stepName}</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Esta sección llega en <strong>{comingIn}</strong>. Por ahora la estructura del
        wizard ya está lista para que la navegues.
      </p>
    </div>
  );
}
