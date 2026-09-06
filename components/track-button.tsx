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

const BASE =
  'w-full rounded-md px-3 py-1.5 text-center text-xs font-medium transition-colors'

export function TrackButton({ product, signedIn, alreadyTracked }: Props) {
  const [state, formAction, isPending] = useActionState(trackProduct, {} as TrackState)

  if (!signedIn) {
    return (
      <Link
        href="/signup"
        className={`${BASE} press block border border-line text-fg-muted hover:border-line-strong hover:bg-surface-2 hover:text-fg`}
      >
        Prati cenu
      </Link>
    )
  }

  if (alreadyTracked || state.tracked) {
    return (
      <span
        // Only animate when this turned true from the user's own click. On a
        // page where the product was already tracked, it is just the resting
        // state and animating it would be noise on every load.
        className={`${BASE} block bg-good-soft text-good ${state.tracked ? 'anim-settle' : ''}`}
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
        className={`${BASE} press bg-fg text-bg hover:opacity-90 disabled:opacity-60`}
      >
        {isPending ? 'Dodajem…' : 'Prati cenu'}
      </button>

      {state.error ? (
        <span role="alert" className="anim-rise text-[11px] leading-snug text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
