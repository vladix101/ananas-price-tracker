import type { Metadata } from 'next'

import { signUp } from '@/app/auth/actions'
import { AuthForm } from '@/components/auth-form'

export const metadata: Metadata = { title: 'Registracija' }

export default function SignupPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <AuthForm mode="signup" action={signUp} />
    </main>
  )
}
