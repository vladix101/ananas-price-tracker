import Link from 'next/link'

import { IconBookmark } from '@/components/icons'
import { SignOutButton } from '@/components/sign-out-button'
import type { AppUser } from '@/lib/database.types'

export function SiteHeader({ user }: { user: AppUser | null }) {
  return (
    <header
      className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 text-[15px] font-semibold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-lg bg-fg text-[13px] font-bold text-bg"
          >
            A
          </span>
          <span className="truncate">Ananas Tracker</span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="tap flex items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-fg-muted transition-colors sm:px-3 sm:hover:bg-surface-2 sm:hover:text-fg"
              >
                <IconBookmark className="shrink-0" />
                {/* Was "Moji" on phones, which read as a broken word. The
                    label now shortens to a whole noun instead of half a
                    phrase, and the icon carries the rest. */}
                <span className="sm:hidden">Praćeni</span>
                <span className="hidden sm:inline">Moji proizvodi</span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="tap flex items-center rounded-lg px-2.5 text-sm font-medium text-fg-muted transition-colors sm:px-3 sm:hover:bg-surface-2 sm:hover:text-fg"
              >
                Prijava
              </Link>
              <Link
                href="/signup"
                className="press tap flex items-center rounded-lg bg-fg px-3.5 text-sm font-medium text-bg transition-opacity sm:hover:opacity-90"
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
