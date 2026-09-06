'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

/**
 * Submit button for the plain server-action forms (stop tracking, save target
 * price) that have no useActionState of their own.
 *
 * Those forms previously gave no sign the click registered — on a slow
 * connection the page just sat there. This is feedback, not decoration: the
 * label swaps and the control dims for as long as the action is in flight.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = '',
}: {
  children: ReactNode
  pendingLabel: string
  className?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      // flex + centring so callers can set a min-height (`tap`) without the
      // label drifting to the top of the box.
      className={`press flex items-center justify-center transition-opacity disabled:opacity-50 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  )
}
