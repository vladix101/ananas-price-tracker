import Link from 'next/link'

import { signOut } from '@/app/auth/actions'
import type { AppUser } from '@/lib/database.types'

export function SiteHeader({ user }: { user: AppUser | null }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden="true"
            className="grid size-7 place-items-center rounded-md bg-accent-soft text-sm text-accent-fg"
          >
            ◎
          </span>
          <span>
            Ananas <span className="text-fg-muted">Tracker</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1.5 text-sm">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                Moji proizvodi
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="press rounded-md border border-line px-3 py-1.5 font-medium transition-colors hover:border-line-strong hover:bg-surface-2"
                >
                  Odjavi se
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                Prijava
              </Link>
              <Link
                href="/signup"
                className="press rounded-md bg-fg px-3.5 py-1.5 font-medium text-bg transition-opacity hover:opacity-90"
              >
                Registruj se
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
