import { AuthShell } from '@/components/shared/AuthShell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
