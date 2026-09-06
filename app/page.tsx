import { Suspense } from 'react'

import { ProductCard } from '@/components/product-card'
import { SiteHeader } from '@/components/site-header'
import { TrackButton } from '@/components/track-button'
import { getCurrentUser } from '@/lib/auth'
import { AnanasScrapeError, searchAnanas } from '@/lib/ananas/search'
import { activeTrackedUrls } from '@/lib/tracking'

type SearchParams = Promise<{ q?: string }>

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const [user, { q }] = await Promise.all([getCurrentUser(), searchParams])
  const query = q?.trim() ?? ''

  return (
    <>
      <SiteHeader user={user} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Pronađi proizvod na ananas.rs
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Zatim ga zaprati i javljamo ti mejlom čim cena padne.
        </p>

        <form method="get" className="mt-6 flex gap-2">
          <input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="npr. laptop, espresso aparat, Dyson…"
            aria-label="Pretraga proizvoda"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Traži
          </button>
        </form>

        {query ? (
          // key: a new query must restart the boundary, not reuse the resolved one
          <Suspense key={query} fallback={<ResultsSkeleton />}>
            <SearchResults query={query} signedIn={user !== null} />
          </Suspense>
        ) : null}
      </main>
    </>
  )
}

async function SearchResults({ query, signedIn }: { query: string; signedIn: boolean }) {
  let products
  try {
    products = await searchAnanas(query)
  } catch (error) {
    const message =
      error instanceof AnanasScrapeError
        ? error.message
        : 'Pretraga trenutno ne radi. Pokušaj ponovo za koji trenutak.'

    console.error('[search] %s', query, error)

    return (
      <p role="alert" className="mt-8 text-sm text-red-600 dark:text-red-400">
        {message}
      </p>
    )
  }

  if (products.length === 0) {
    return (
      <p className="mt-8 text-sm text-neutral-500">
        Nema rezultata za <strong>{query}</strong>.
      </p>
    )
  }

  // Only signed-in users can track, so only they need the lookup.
  const tracked = signedIn ? await activeTrackedUrls() : new Set<string>()

  return (
    <>
      <p className="mt-8 text-sm text-neutral-500">
        {products.length} rezultata za <strong>{query}</strong>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            action={
              <TrackButton
                product={product}
                signedIn={signedIn}
                alreadyTracked={tracked.has(product.url)}
              />
            }
          />
        ))}
      </div>
    </>
  )
}

function ResultsSkeleton() {
  return (
    <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="h-64 rounded-lg border border-neutral-200 dark:border-neutral-800"
        />
      ))}
    </div>
  )
}
