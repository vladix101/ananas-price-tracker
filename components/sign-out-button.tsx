'use client'

import { useRef } from 'react'

import { signOut } from '@/app/auth/actions'
import { SubmitButton } from '@/components/submit-button'

/**
 * Sign out behind a confirmation.
 *
 * A native <dialog> rather than window.confirm() or a hand-rolled overlay: the
 * browser gives focus trapping, Escape, inertness of the page behind it and
 * correct stacking for free, and it can still be styled.
 */
export function SignOutButton() {
  const dialog = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="press tap flex items-center rounded-lg border border-line px-2.5 text-sm font-medium transition-colors sm:px-3 sm:hover:border-line-strong sm:hover:bg-surface-2"
      >
        Odjava
      </button>

      <dialog
        ref={dialog}
        // Clicking the backdrop closes. The check compares against the dialog
        // itself: clicks inside the content bubble up from a child, so only a
        // hit on the padding-box area — the backdrop — matches.
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close()
        }}
        className="anim-settle m-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 text-fg shadow-[0_16px_40px_-12px_rgb(0_0_0/0.25)] backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <h2 className="text-base font-semibold tracking-tight">Odjaviti se?</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
          Praćeni proizvodi ostaju sačuvani. Prijavi se ponovo kad god hoćeš.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="press tap flex flex-1 items-center justify-center rounded-lg border border-line text-sm font-medium transition-colors sm:hover:bg-surface-2"
          >
            Otkaži
          </button>

          <form action={signOut} className="flex-1">
            <SubmitButton
              pendingLabel="Odjavljujem…"
              className="tap w-full rounded-lg bg-fg text-sm font-medium text-bg sm:hover:opacity-90"
            >
              Odjavi se
            </SubmitButton>
          </form>
        </div>
      </dialog>
    </>
  )
}
