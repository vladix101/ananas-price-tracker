import type { Metadata } from 'next'

import { signUp } from '@/app/auth/actions'
import { AuthForm } from '@/components/auth-form'
import { AuthLayout } from '@/components/auth-layout'

export const metadata: Metadata = { title: 'Registracija' }

export default function SignupPage() {
  return (
    <AuthLayout>
      <AuthForm mode="signup" action={signUp} />
    </AuthLayout>
  )
}
