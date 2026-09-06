import type { Metadata } from 'next'

import { signIn } from '@/app/auth/actions'
import { AuthForm } from '@/components/auth-form'

export const metadata: Metadata = { title: 'Prijava' }

const LINK_ERRORS: Record<string, string> = {
  'link-nevazeci': 'Link za potvrdu nije ispravan. Pokušaj ponovo da se registruješ.',
  'link-istekao': 'Link za potvrdu je istekao. Zatraži novi.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <AuthForm
        mode="login"
        action={signIn}
        next={next}
        initialError={error ? LINK_ERRORS[error] : undefined}
      />
    </main>
  )
}
