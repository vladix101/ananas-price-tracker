import Link from 'next/link'

import { signOut } from '@/app/auth/actions'
import type { AppUser } from '@/lib/database.types'

export function SiteHeader({ user }: { user: AppUser | null }) {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          Ananas Price Tracker
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="font-medium hover:underline underline-offset-4">
                Moji proizvodi
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 px-3 py-1.5 font-medium dark:border-neutral-700"
                >
                  Odjavi se
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium hover:underline underline-offset-4">
                Prijava
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                Registracija
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
