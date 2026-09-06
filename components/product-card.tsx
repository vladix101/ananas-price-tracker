import type { CSSProperties, ReactNode } from 'react'

import type { AnanasProduct } from '@/lib/ananas/search'
import { formatPrice } from '@/lib/format'

/**
 * Images come from static.ananas.rs with a plain <img>, not next/image:
 * next/image proxies through our server, which would make *us* fetch their
 * assets. A plain tag is the visitor's own browser making the request, same as
 * viewing the source page.
 *
 * width/height are set so the browser reserves the box before the image lands.
 * Without them a phone reflows the whole grid twelve times while scrolling.
 */
export function ProductCard({
  product,
  action,
  index = 0,
}: {
  product: AnanasProduct
  /** Slot for the "Prati cenu" control, so the card stays presentational. */
  action?: ReactNode
  /** Position in the grid, used to stagger the enter animation. */
  index?: number
}) {
  const saving = product.basePrice ? product.basePrice - product.price : 0
  // The first row is above the fold; letting it lazy-load delays the only
  // thing worth seeing on arrival.
  const eager = index < 4

  return (
    <article
      style={{ '--i': index } as CSSProperties}
      className="anim-rise anim-stagger group flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-[translate,box-shadow,border-color] duration-200 ease-out sm:hover:-translate-y-0.5 sm:hover:border-line-strong sm:hover:shadow-[0_1px_2px_-1px_rgb(0_0_0/0.07),0_8px_20px_-6px_rgb(0_0_0/0.10)]"
    >
      <a
        href={product.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        tabIndex={-1}
        aria-hidden="true"
        className="relative flex aspect-square items-center justify-center bg-white p-3 sm:p-5"
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- see note above
          <img
            src={product.imageUrl}
            alt=""
            width={300}
            height={300}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={eager ? 'high' : 'auto'}
            className="max-h-full w-auto max-w-full object-contain transition-transform duration-300 ease-out sm:group-hover:scale-[1.03]"
          />
        ) : (
          <span className="text-xs text-fg-subtle">bez slike</span>
        )}

        {product.discountPercentage > 0 ? (
          <span className="absolute left-2 top-2 rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-accent-fg sm:left-3 sm:top-3 sm:px-2">
            −{product.discountPercentage}%
          </span>
        ) : null}
      </a>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-2.5 sm:p-3.5">
        {product.brand ? (
          <span className="truncate text-[10px] font-medium uppercase tracking-wider text-fg-subtle sm:text-[11px]">
            {product.brand}
          </span>
        ) : null}

        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="line-clamp-2 text-[13px] font-medium leading-snug sm:hover:underline sm:underline-offset-2"
        >
          {product.name}
        </a>

        <div className="mt-auto pt-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[15px] font-semibold tabular-nums sm:text-base">
              {formatPrice(product.price)}
            </span>
            {product.basePrice ? (
              <span className="text-xs tabular-nums text-fg-subtle line-through">
                {formatPrice(product.basePrice)}
              </span>
            ) : null}
          </div>

          {saving > 0 ? (
            <p className="mt-0.5 text-[11px] font-medium tabular-nums text-good sm:text-xs">
              −{formatPrice(saving)}
            </p>
          ) : null}

          {!product.inStock ? (
            <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">Nedostupno</p>
          ) : null}
        </div>

        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </article>
  )
}
