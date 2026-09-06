'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import type { AuthState } from '@/app/auth/actions'

type Props = {
  mode: 'login' | 'signup'
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>
  /** Path to return to after a successful login. */
  next?: string
  /** Error surfaced by a redirect (e.g. an expired confirmation link). */
  initialError?: string
}

const COPY = {
  login: {
    title: 'Prijava',
    submit: 'Prijavi se',
    pending: 'Prijavljivanje…',
    switchText: 'Nemaš nalog?',
    switchHref: '/signup',
    switchLabel: 'Registruj se',
    autoComplete: 'current-password',
  },
  signup: {
    title: 'Registracija',
    submit: 'Napravi nalog',
    pending: 'Pravim nalog…',
    switchText: 'Već imaš nalog?',
    switchHref: '/login',
    switchLabel: 'Prijavi se',
    autoComplete: 'new-password',
  },
} as const

export function AuthForm({ mode, action, next, initialError }: Props) {
  const [state, formAction, isPending] = useActionState(action, {} as AuthState)
  const copy = COPY[mode]
  const error = state.error ?? initialError

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-1 text-sm text-neutral-500">Pratite cene sa ananas.rs</p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Lozinka</span>
          <input
            name="password"
            type="password"
            required
            minLength={mode === 'signup' ? 8 : undefined}
            autoComplete={copy.autoComplete}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300"
          />
          {mode === 'signup' ? (
            <span className="text-xs text-neutral-500">Najmanje 8 karaktera.</span>
          ) : null}
        </label>

        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        {state.notice ? (
          <p role="status" className="text-sm text-green-700 dark:text-green-400">
            {state.notice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {isPending ? copy.pending : copy.submit}
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-500">
        {copy.switchText}{' '}
        <Link href={copy.switchHref} className="font-medium text-neutral-900 underline underline-offset-4 dark:text-white">
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  )
}
