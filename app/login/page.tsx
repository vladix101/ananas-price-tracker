import type { Metadata } from 'next'

import { signIn } from '@/app/auth/actions'
import { AuthForm } from '@/components/auth-form'
import { AuthLayout } from '@/components/auth-layout'

export const metadata: Metadata = { title: 'Prijava' }

const LINK_MESSAGES: Record<string, string> = {
  'link-nevazeci': 'Link za potvrdu nije ispravan. Pokušaj ponovo da se registruješ.',
  'link-istekao': 'Link za potvrdu je istekao. Registruj se ponovo da dobiješ nov.',
  // Not a failure: the address is confirmed, only the session handoff did not
  // happen (a prefetched or reopened link).
  'potvrdjen-prijavi-se': 'Mejl je potvrđen. Prijavi se da nastaviš.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  return (
    <AuthLayout>
      <AuthForm
        mode="login"
        action={signIn}
        next={next}
        initialError={error ? LINK_MESSAGES[error] : undefined}
      />
    </AuthLayout>
  )
}
