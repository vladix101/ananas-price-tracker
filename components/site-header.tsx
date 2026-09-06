import Link from 'next/link'

import { signOut } from '@/app/auth/actions'
import type { AppUser } from '@/lib/database.types'

export function SiteHeader({ user }: { user: AppUser | null }) {
  return (
    <header
      className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3.5">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-semibold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-md bg-fg text-sm text-bg"
          >
            ◎
          </span>
          {/* The word "Tracker" is the first thing to go on a narrow phone. */}
          <span className="truncate">
            Ananas <span className="hidden text-fg-muted sm:inline">Tracker</span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1 text-sm">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="tap flex items-center rounded-md px-2.5 font-medium text-fg-muted transition-colors sm:px-3 sm:hover:bg-surface-2 sm:hover:text-fg"
              >
                Moji
                <span className="hidden sm:ml-1 sm:inline">proizvodi</span>
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="press tap flex items-center rounded-md border border-line px-2.5 font-medium transition-colors sm:px-3 sm:hover:border-line-strong sm:hover:bg-surface-2"
                >
                  Odjava
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="tap flex items-center rounded-md px-2.5 font-medium text-fg-muted transition-colors sm:px-3 sm:hover:bg-surface-2 sm:hover:text-fg"
              >
                Prijava
              </Link>
              <Link
                href="/signup"
                className="press tap flex items-center rounded-md bg-fg px-3 font-medium text-bg transition-opacity sm:px-3.5 sm:hover:opacity-90"
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
