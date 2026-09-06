'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { trackProduct, type TrackState } from '@/app/actions/tracking'
import type { AnanasProduct } from '@/lib/ananas/search'

type Props = {
  product: AnanasProduct
  /** Null when nobody is signed in — the control becomes a login prompt. */
  signedIn: boolean
  /** True when this product is already on the user's active list. */
  alreadyTracked: boolean
}

export function TrackButton({ product, signedIn, alreadyTracked }: Props) {
  const [state, formAction, isPending] = useActionState(trackProduct, {} as TrackState)

  if (!signedIn) {
    return (
      <Link
        href="/login"
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-center text-xs font-medium dark:border-neutral-700"
      >
        Prijavi se da pratiš
      </Link>
    )
  }

  if (alreadyTracked || state.tracked) {
    return (
      <span
        // Only animate when this turned true from the user's own click. On a
        // page where the product was already tracked, it is just the resting
        // state and animating it would be noise on every load.
        className={`rounded-md border border-neutral-300 px-3 py-1.5 text-center text-xs font-medium text-neutral-500 dark:border-neutral-700 ${
          state.tracked ? 'anim-settle' : ''
        }`}
      >
        Pratiš ✓
      </span>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="product_name" value={product.name} />
      <input type="hidden" name="ananas_url" value={product.url} />
      <input type="hidden" name="current_price" value={product.price} />

      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="press rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-opacity disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {isPending ? 'Dodajem…' : 'Prati ovo'}
      </button>

      {state.error ? (
        <span role="alert" className="anim-rise text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
