import { redirect } from 'next/navigation';
import { VerifyForm } from './VerifyForm';

export const metadata = { title: 'Verifica tu código' };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  if (!email) {
    redirect('/login');
  }

  return <VerifyForm email={email} />;
}
