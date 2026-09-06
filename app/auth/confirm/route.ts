import { redirect } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Landing point for the link Supabase mails out.
 *
 * It can arrive in three shapes, and an earlier version of this route only
 * understood one of them:
 *
 *   ?code=…                  PKCE. What the default {{ .ConfirmationURL }}
 *                            template produces: Supabase verifies the token on
 *                            its own /auth/v1/verify first, then redirects here
 *                            with an auth code to exchange. The account is
 *                            already confirmed by this point.
 *   ?token_hash=…&type=…     What a template using {{ .TokenHash }} produces —
 *                            we verify it ourselves.
 *   ?error=…                 Supabase refused (expired or reused link).
 *
 * Handling only token_hash meant every real confirmation ended on
 * "link nije ispravan" even though the address had just been verified.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const error = searchParams.get('error') ?? searchParams.get('error_code')
  if (error) {
    const expired =
      error.includes('expired') || searchParams.get('error_code') === 'otp_expired'
    redirect(`/login?error=${expired ? 'link-istekao' : 'link-nevazeci'}`)
  }

  const supabase = await createClient()
  const code = searchParams.get('code')

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      // The address is verified either way — Supabase did that before
      // redirecting. Only the session handoff failed, so ask for a login
      // rather than claiming the link was bad.
      redirect('/login?error=potvrdjen-prijavi-se')
    }
    redirect('/dashboard')
  }

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (tokenHash && type) {
    const { error: otpError } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })
    if (otpError) {
      redirect('/login?error=link-istekao')
    }
    redirect('/dashboard')
  }

  // No recognised parameters. Most likely an already-consumed link that the
  // mail client prefetched, or the user opening it twice.
  redirect('/login?error=potvrdjen-prijavi-se')
}
