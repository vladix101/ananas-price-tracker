import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { AppUser } from '@/lib/database.types'

/**
 * Data access layer for the signed-in user.
 *
 * proxy.ts already blocks anonymous requests to protected routes, but that is
 * an optimistic check. Everything that reads or writes user data goes through
 * here so the real check happens next to the data, not in the router.
 */

/** The signed-in user's profile row, or null when nobody is signed in. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (data) return data

  // Signed in with no profile row. Happens when the row is deleted by hand:
  // auth.users survives, so the account works but the app has nothing to read,
  // and every protected page would bounce back to /login forever.
  // ensure_profile() recreates it from auth.users.
  const { data: repaired, error } = await supabase.rpc('ensure_profile')
  if (error) {
    console.error('[auth] profil nedostaje i popravka nije uspela', error)
    return null
  }

  return repaired ?? null
}

/** Same, but sends anonymous visitors to the login page. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}
