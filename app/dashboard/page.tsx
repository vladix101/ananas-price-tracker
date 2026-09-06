import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'

import { setTargetPrice, stopTracking } from '@/app/actions/tracking'
import { PriceSparkline } from '@/components/price-sparkline'
import { SiteHeader } from '@/components/site-header'
import { SubmitButton } from '@/components/submit-button'
import { requireUser } from '@/lib/auth'
import { formatDateTime, formatPrice } from '@/lib/format'
import { trackedProductsWithHistory } from '@/lib/tracking'

export const metadata: Metadata = { title: 'Moji proizvodi' }

const INPUT =
  'tap w-full min-w-0 rounded-md border border-line bg-surface px-3 tabular-nums outline-none transition-colors placeholder:text-fg-subtle focus:border-fg-muted'

export default async function DashboardPage() {
  const user = await requireUser()
  const products = await trackedProductsWithHistory()

  return (
    <>
      <SiteHeader user={user} />

      <main className="pb-safe mx-auto w-full max-w-4xl flex-1 px-4 py-7 sm:px-5 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[1.6rem] font-semibold tracking-tight sm:text-2xl">Moji proizvodi</h1>
            <p className="mt-0.5 truncate text-sm text-fg-muted">{user.email}</p>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-medium text-fg-muted">
              {user.is_paid ? 'Plaćen nalog' : `${products.length} / 3 praćena`}
            </span>
            {user.is_admin ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent-fg">
                Admin
              </span>
            ) : null}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="mt-10 rounded-card border border-dashed border-line-strong bg-surface p-12 text-center">
            <p className="text-sm font-medium">Još ne pratiš nijedan proizvod.</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
              Nađi nešto na početnoj i klikni „Prati cenu”. Javljamo ti čim pojeftini.
            </p>
            <Link
              href="/"
              className="press mt-5 inline-block rounded-card bg-fg px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90"
            >
              Pronađi proizvod
            </Link>
          </div>
        ) : (
          <ul className="mt-7 flex flex-col gap-3">
            {products.map((product, index) => {
              const history = product.price_history
              const latest = history.at(-1)
              const reachedTarget =
                product.target_price !== null &&
                product.current_price !== null &&
                product.current_price <= product.target_price

              return (
                <li
                  key={product.id}
                  style={{ '--i': index } as CSSProperties}
                  className="anim-rise anim-stagger flex flex-col gap-4 rounded-card border border-line bg-surface p-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-4"
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={product.ananas_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-sm font-medium leading-snug hover:underline underline-offset-2"
                    >
                      {product.product_name}
                    </a>

                    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-xl font-semibold tabular-nums">
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

                    {latest ? (
                      <p className="mt-1 text-xs text-fg-subtle">
                        poslednja provera {formatDateTime(latest.scraped_at)}
                      </p>
                    ) : null}

                    <div className="mt-3.5">
                      <PriceSparkline points={history} />
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 border-t border-line pt-3.5 sm:w-48 sm:border-0 sm:pt-0">
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
                        className="tap shrink-0 rounded-md border border-line px-3.5 text-xs font-medium sm:hover:border-line-strong sm:hover:bg-surface-2"
                      >
                        Sačuvaj
                      </SubmitButton>
                    </form>

                    <form action={stopTracking}>
                      <input type="hidden" name="id" value={product.id} />
                      <SubmitButton
                        pendingLabel="Prekidam…"
                        className="tap w-full rounded-md border border-line px-3 text-xs font-medium text-fg-muted sm:border-0 sm:hover:bg-surface-2 sm:hover:text-danger"
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
    </>
  )
}
