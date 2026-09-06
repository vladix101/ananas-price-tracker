import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'

import { setTargetPrice, stopTracking } from '@/app/actions/tracking'
import { IconExternal } from '@/components/icons'
import { PriceSparkline } from '@/components/price-sparkline'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { SubmitButton } from '@/components/submit-button'
import { requireUser } from '@/lib/auth'
import { formatDateTime, formatPrice } from '@/lib/format'
import { trackedProductsWithHistory } from '@/lib/tracking'

export const metadata: Metadata = { title: 'Moji proizvodi' }

const INPUT =
  'tap w-full min-w-0 rounded-lg border border-line bg-surface px-3 tabular-nums outline-none transition-colors placeholder:text-fg-subtle focus:border-fg-muted'

export default async function DashboardPage() {
  const user = await requireUser()
  const products = await trackedProductsWithHistory()

  const onTarget = products.filter(
    (p) =>
      p.target_price !== null && p.current_price !== null && p.current_price <= p.target_price,
  ).length

  const lastCheck = products
    .map((p) => p.price_history.at(-1)?.scraped_at)
    .filter((t): t is string => Boolean(t))
    .sort()
    .at(-1)

  return (
    <>
      <SiteHeader user={user} />

      <main className="pb-safe mx-auto w-full max-w-4xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[1.6rem] font-semibold tracking-tight sm:text-[1.75rem]">
              Moji proizvodi
            </h1>
            <p className="mt-0.5 truncate text-sm text-fg-muted">{user.email}</p>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-medium text-fg-muted">
              {user.is_paid || user.is_admin
                ? `${products.length} praćenih`
                : `${products.length} / 3 praćena`}
            </span>
            {onTarget > 0 ? (
              <span className="rounded-full bg-good-soft px-2.5 py-1 font-medium text-good">
                {onTarget} na cilju
              </span>
            ) : null}
            {user.is_admin ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent-fg">
                Admin
              </span>
            ) : null}
          </div>
        </div>

        {lastCheck ? (
          <p className="mt-3 text-xs text-fg-subtle">
            Poslednja provera cena: {formatDateTime(lastCheck)}
          </p>
        ) : null}

        {products.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center sm:p-14">
            <p className="text-[15px] font-medium">Još ne pratiš nijedan proizvod.</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">
              Nađi nešto na početnoj i klikni „Prati cenu”. Javljamo ti mejlom čim
              pojeftini.
            </p>
            <Link
              href="/"
              className="press tap mt-6 inline-flex items-center rounded-xl bg-fg px-5 text-sm font-medium text-bg transition-opacity sm:hover:opacity-90"
            >
              Pronađi proizvod
            </Link>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {products.map((product, index) => {
              const history = product.price_history
              const reachedTarget =
                product.target_price !== null &&
                product.current_price !== null &&
                product.current_price <= product.target_price

              return (
                <li
                  key={product.id}
                  style={{ '--i': index } as CSSProperties}
                  // `relative` anchors the stretched link below. The whole card
                  // becomes the target for ananas.rs — previously only the
                  // title text was clickable, which is a small target on a
                  // phone and invisible as an affordance.
                  className="anim-rise anim-stagger group relative flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5 sm:hover:border-line-strong"
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={product.ananas_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      // after:inset-0 stretches the hit area over the card.
                      // The controls opposite carry z-10 so they stay on top.
                      className="flex items-start gap-1.5 text-[15px] font-medium leading-snug after:absolute after:inset-0 after:rounded-2xl sm:group-hover:underline sm:underline-offset-2"
                    >
                      <span className="min-w-0">{product.product_name}</span>
                      <IconExternal className="mt-0.5 shrink-0 text-fg-subtle" />
                    </a>

                    <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                      <span className="text-2xl font-semibold tabular-nums tracking-tight">
                        {product.current_price !== null
                          ? formatPrice(product.current_price)
                          : '—'}
                      </span>
                      {product.target_price !== null ? (
                        <span
                          className={
                            reachedTarget
                              ? 'rounded-full bg-good-soft px-2 py-0.5 text-xs font-medium tabular-nums text-good'
                              : 'text-xs tabular-nums text-fg-muted'
                          }
                        >
                          {reachedTarget ? 'cilj dostignut · ' : 'cilj '}
                          {formatPrice(product.target_price)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4">
                      <PriceSparkline points={history} />
                    </div>
                  </div>

                  {/* z-10 keeps these above the stretched link. */}
                  <div className="relative z-10 flex shrink-0 flex-col gap-2 border-t border-line pt-4 sm:w-44 sm:border-0 sm:pt-0">
                    <form action={setTargetPrice} className="flex gap-1.5">
                      <input type="hidden" name="id" value={product.id} />
                      <input
                        name="target_price"
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        defaultValue={product.target_price ?? ''}
                        placeholder="ciljna cena"
                        aria-label={`Ciljna cena za ${product.product_name}`}
                        className={INPUT}
                      />
                      <SubmitButton
                        pendingLabel="…"
                        className="tap shrink-0 rounded-lg border border-line px-3.5 text-xs font-medium sm:hover:border-line-strong sm:hover:bg-surface-2"
                      >
                        Sačuvaj
                      </SubmitButton>
                    </form>

                    <form action={stopTracking}>
                      <input type="hidden" name="id" value={product.id} />
                      <SubmitButton
                        pendingLabel="Prekidam…"
                        className="tap w-full rounded-lg border border-line px-3 text-xs font-medium text-fg-muted sm:border-0 sm:hover:bg-surface-2 sm:hover:text-danger"
                      >
                        Prestani da pratiš
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      <SiteFooter />
    </>
  )
}
