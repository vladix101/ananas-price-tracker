import type { CSSProperties, ReactNode } from 'react'

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
  index = 0,
}: {
  product: AnanasProduct
  /** Slot for the "Prati ovo" control, so the card stays presentational. */
  action?: ReactNode
  /** Position in the grid, used to stagger the enter animation. */
  index?: number
}) {
  const saving = product.basePrice ? product.basePrice - product.price : 0

  return (
    <article
      // Results arrive together after a wait, so they enter together — the
      // stagger only keeps the grid from snapping in as one hard block. It is
      // capped in CSS so late cards are not left behind.
      style={{ '--i': index } as CSSProperties}
      className="anim-rise anim-stagger group flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-[translate,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_1px_2px_-1px_rgb(0_0_0/0.07),0_8px_20px_-6px_rgb(0_0_0/0.10)]"
    >
      <a
        href={product.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        tabIndex={-1}
        aria-hidden="true"
        className="relative flex aspect-[4/3] items-center justify-center bg-white p-5"
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- see note above
          <img
            src={product.imageUrl}
            alt=""
            loading="lazy"
            className="max-h-full max-w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <span className="text-xs text-fg-subtle">bez slike</span>
        )}

        {product.discountPercentage > 0 ? (
          <span className="absolute left-3 top-3 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold tabular-nums text-accent-fg">
            −{product.discountPercentage}%
          </span>
        ) : null}
      </a>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        {product.brand ? (
          <span className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
            {product.brand}
          </span>
        ) : null}

        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="line-clamp-2 text-[13px] font-medium leading-snug hover:underline underline-offset-2"
        >
          {product.name}
        </a>

        <div className="mt-auto pt-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-base font-semibold tabular-nums">
              {formatPrice(product.price)}
            </span>
            {product.basePrice ? (
              <span className="text-xs tabular-nums text-fg-subtle line-through">
                {formatPrice(product.basePrice)}
              </span>
            ) : null}
          </div>

          {saving > 0 ? (
            <p className="mt-0.5 text-xs font-medium tabular-nums text-good">
              jeftinije za {formatPrice(saving)}
            </p>
          ) : null}

          {!product.inStock ? (
            <p className="mt-0.5 text-xs text-fg-muted">Trenutno nedostupno</p>
          ) : null}
        </div>

        {action ? <div className="pt-0.5">{action}</div> : null}
      </div>
    </article>
  )
}
