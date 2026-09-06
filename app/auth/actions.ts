'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import { createClient } from '@/lib/supabase/server'

export type AuthState = {
  error?: string
  /** Set when sign-up succeeded but the address still needs confirming. */
  notice?: string
}

const MIN_PASSWORD_LENGTH = 8

/** Only ever redirect within this app — an open redirect is an auth bug. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : ''
  return next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
    next: safeNext(formData.get('next')),
  }
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, next } = readCredentials(formData)

  if (!email || !password) {
    return { error: 'Unesi email i lozinku.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Supabase deliberately does not say which half was wrong; neither do we.
    return { error: 'Pogrešan email ili lozinka.' }
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData)

  if (!email || !password) {
    return { error: 'Unesi email i lozinku.' }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Lozinka mora imati bar ${MIN_PASSWORD_LENGTH} karaktera.` }
  }

  const origin = (await headers()).get('origin')
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: origin ? `${origin}/auth/confirm` : undefined },
  })

  if (error) {
    return { error: error.message }
  }

  // With "Confirm email" on, Supabase returns a user but no session.
  if (!data.session) {
    return { notice: `Poslali smo potvrdu na ${email}. Otvori link iz mejla da aktiviraš nalog.` }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  // Home, not /login. Signing out is not an attempt to sign in — the homepage
  // in its signed-out state (intro + sale grid) is somewhere to be, while a
  // login form is a dead end for someone who just left.
  redirect('/')
}
