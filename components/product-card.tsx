import type { ReactNode } from 'react'

import type { AnanasProduct } from '@/lib/ananas/search'
import { formatPrice } from '@/lib/format'

/**
 * Images are rendered with a plain <img>, not next/image, on purpose:
 * next/image proxies through our server, which would make *us* fetch
 * ananas.rs/assets/ — a path their robots.txt disallows. A plain tag is the
 * visitor's own browser making the request, same as viewing the source page.
 */
export function ProductCard({
  product,
  action,
}: {
  product: AnanasProduct
  /** Slot for the "Prati ovo" control, so the card stays presentational. */
  action?: ReactNode
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <a
        href={product.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="flex aspect-square items-center justify-center bg-white p-4"
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- see note above
          <img
            src={product.imageUrl}
            alt=""
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-xs text-neutral-400">bez slike</span>
        )}
      </a>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {product.brand ? (
          <span className="text-xs uppercase tracking-wide text-neutral-400">
            {product.brand}
          </span>
        ) : null}

        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="line-clamp-3 text-sm font-medium hover:underline underline-offset-2"
        >
          {product.name}
        </a>

        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="font-semibold">{formatPrice(product.price)}</span>
          {product.basePrice ? (
            <span className="text-xs text-neutral-400 line-through">
              {formatPrice(product.basePrice)}
            </span>
          ) : null}
        </div>

        {!product.inStock ? (
          <span className="text-xs text-neutral-500">Trenutno nedostupno</span>
        ) : null}

        {action}
      </div>
    </article>
  )
}
