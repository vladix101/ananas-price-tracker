'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import type { AuthState } from '@/app/auth/actions'

type Props = {
  mode: 'login' | 'signup'
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>
  /** Path to return to after a successful login. */
  next?: string
  /**
   * Message carried in by a redirect. Tone matters: "mejl je potvrđen" is a
   * success and must not be painted like a failure, which is exactly what an
   * earlier version did.
   */
  initialMessage?: { text: string; tone: 'error' | 'success' }
}

const COPY = {
  login: {
    title: 'Prijavi se',
    lead: 'Nastavi tamo gde si stao.',
    submit: 'Prijavi se',
    pending: 'Prijavljujem…',
    switchText: 'Nemaš nalog?',
    switchHref: '/signup',
    switchLabel: 'Registruj se',
    autoComplete: 'current-password',
  },
  signup: {
    title: 'Napravi nalog',
    lead: 'Prati do tri proizvoda besplatno.',
    submit: 'Napravi nalog',
    pending: 'Pravim nalog…',
    switchText: 'Već imaš nalog?',
    switchHref: '/login',
    switchLabel: 'Prijavi se',
    autoComplete: 'new-password',
  },
} as const

const INPUT =
  'tap w-full rounded-card border border-line bg-surface px-3.5 outline-none transition-colors placeholder:text-fg-subtle focus:border-fg-muted'

export function AuthForm({ mode, action, next, initialMessage }: Props) {
  const [state, formAction, isPending] = useActionState(action, {} as AuthState)
  const copy = COPY[mode]

  // A fresh submit error always wins over whatever the redirect said.
  const message: Props['initialMessage'] = state.error
    ? { text: state.error, tone: 'error' }
    : initialMessage

  // Once the confirmation mail is out, the form is done — leaving it on screen
  // invites a second submit that only produces "user already registered".
  if (state.notice) {
    return (
      <div className="anim-rise rounded-card border border-line bg-surface p-6 text-center">
        <div
          aria-hidden="true"
          className="mx-auto grid size-10 place-items-center rounded-full bg-good-soft text-good"
        >
          ✓
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Proveri mejl</h1>
        <p role="status" className="mt-2 text-sm leading-relaxed text-fg-muted">
          {state.notice}
        </p>
        <p className="mt-4 text-xs text-fg-subtle">
          Nije stigao? Pogledaj i Promotions i Spam.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-line bg-surface p-5 sm:p-7">
      <h1 className="text-xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-1 text-sm text-fg-muted">{copy.lead}</p>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="ti@primer.com"
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Lozinka</span>
          <input
            name="password"
            type="password"
            required
            minLength={mode === 'signup' ? 8 : undefined}
            autoComplete={copy.autoComplete}
            placeholder={mode === 'signup' ? 'najmanje 8 karaktera' : '••••••••'}
            className={INPUT}
          />
        </label>

        {message ? (
          <p
            role={message.tone === 'error' ? 'alert' : 'status'}
            className={`anim-rise flex items-start gap-2 rounded-md px-3 py-2 text-[13px] ${
              message.tone === 'error'
                ? 'bg-danger-soft text-danger'
                : 'bg-good-soft text-good'
            }`}
          >
            <span aria-hidden="true">{message.tone === 'error' ? '!' : '✓'}</span>
            <span>{message.text}</span>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="press tap mt-1 rounded-card bg-fg px-4 text-sm font-medium text-bg transition-opacity disabled:opacity-60 sm:hover:opacity-90"
        >
          {isPending ? copy.pending : copy.submit}
        </button>
      </form>

      <p className="mt-5 border-t border-line pt-4 text-sm text-fg-muted">
        {copy.switchText}{' '}
        <Link
          href={copy.switchHref}
          className="font-medium text-fg underline underline-offset-4"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  )
}
