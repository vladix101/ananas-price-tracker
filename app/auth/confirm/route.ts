import { redirect } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Landing point for the confirmation link Supabase mails out. Exchanging the
 * token here (rather than client-side) means the session cookie is set before
 * the first render, so the redirect below lands on an already-signed-in page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (!tokenHash || !type) {
    redirect('/login?error=link-nevazeci')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error) {
    redirect('/login?error=link-istekao')
  }

  redirect('/dashboard')
}
