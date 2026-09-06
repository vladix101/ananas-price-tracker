import type { Metadata } from 'next'

import { signIn } from '@/app/auth/actions'
import { AuthForm } from '@/components/auth-form'
import { AuthLayout } from '@/components/auth-layout'

export const metadata: Metadata = { title: 'Prijava' }

type Tone = 'error' | 'success'

const LINK_MESSAGES: Record<string, { text: string; tone: Tone }> = {
  'link-nevazeci': {
    text: 'Link za potvrdu nije ispravan. Pokušaj ponovo da se registruješ.',
    tone: 'error',
  },
  'link-istekao': {
    text: 'Link za potvrdu je istekao. Registruj se ponovo da dobiješ nov.',
    tone: 'error',
  },
  // Not a failure: the address is confirmed, only the session handoff did not
  // happen (a prefetched or reopened link). Painting this red made a success
  // look like something had gone wrong.
  'potvrdjen-prijavi-se': {
    text: 'Mejl je potvrđen. Prijavi se da nastaviš.',
    tone: 'success',
  },
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
        initialMessage={error ? LINK_MESSAGES[error] : undefined}
      />
    </AuthLayout>
  )
}
