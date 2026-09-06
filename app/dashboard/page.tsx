import type { Metadata } from 'next'
import Link from 'next/link'

import { setTargetPrice, stopTracking } from '@/app/actions/tracking'
import { PriceSparkline } from '@/components/price-sparkline'
import { SiteHeader } from '@/components/site-header'
import { requireUser } from '@/lib/auth'
import { formatDateTime, formatPrice } from '@/lib/format'
import { trackedProductsWithHistory } from '@/lib/tracking'

export const metadata: Metadata = { title: 'Moji proizvodi' }

export default async function DashboardPage() {
  const user = await requireUser()
  const products = await trackedProductsWithHistory()

  return (
    <>
      <SiteHeader user={user} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Moji proizvodi</h1>
            <p className="mt-1 text-sm text-neutral-500">{user.email}</p>
          </div>

          <div className="flex gap-2 text-xs">
            <span className="rounded-full border border-neutral-300 px-2 py-0.5 dark:border-neutral-700">
              {user.is_paid ? 'Plaćen nalog' : 'Besplatan nalog'}
            </span>
            {user.is_admin ? (
              <span className="rounded-full border border-neutral-300 px-2 py-0.5 dark:border-neutral-700">
                Admin — vidiš sve korisnike
              </span>
            ) : null}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
            <p className="text-sm text-neutral-500">Još ne pratiš nijedan proizvod.</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
            >
              Pronađi proizvod
            </Link>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {products.map((product) => {
              const history = product.price_history
              const latest = history.at(-1)
              const reachedTarget =
                product.target_price !== null &&
                product.current_price !== null &&
                product.current_price <= product.target_price

              return (
                <li
                  key={product.id}
                  className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 sm:flex-row sm:items-start sm:justify-between dark:border-neutral-800"
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={product.ananas_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-sm font-medium hover:underline underline-offset-2"
                    >
                      {product.product_name}
                    </a>

                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-lg font-semibold">
                        {product.current_price !== null
                          ? formatPrice(product.current_price)
                          : '—'}
                      </span>
                      {product.target_price !== null ? (
                        <span
                          className={
                            reachedTarget
                              ? 'text-xs font-medium text-green-700 dark:text-green-400'
                              : 'text-xs text-neutral-500'
                          }
                        >
                          cilj {formatPrice(product.target_price)}
                          {reachedTarget ? ' — dostignut' : ''}
                        </span>
                      ) : null}
                    </div>

                    {latest ? (
                      <p className="mt-0.5 text-xs text-neutral-400">
                        poslednja provera {formatDateTime(latest.scraped_at)}
                      </p>
                    ) : null}

                    <div className="mt-3">
                      <PriceSparkline points={history} />
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:w-52">
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
                        className="w-full min-w-0 rounded-md border border-neutral-300 px-2 py-1.5 text-xs outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300"
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium dark:border-neutral-700"
                      >
                        Sačuvaj
                      </button>
                    </form>

                    <form action={stopTracking}>
                      <input type="hidden" name="id" value={product.id} />
                      <button
                        type="submit"
                        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
                      >
                        Prestani da pratiš
                      </button>
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
