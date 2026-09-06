import { Suspense } from 'react'

import { ProductCard } from '@/components/product-card'
import { SiteHeader } from '@/components/site-header'
import { TrackButton } from '@/components/track-button'
import { getCurrentUser } from '@/lib/auth'
import { AnanasScrapeError, saleProducts, searchAnanas } from '@/lib/ananas/search'
import { activeTrackedUrls } from '@/lib/tracking'

type SearchParams = Promise<{ q?: string }>

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const [user, { q }] = await Promise.all([getCurrentUser(), searchParams])
  const query = q?.trim() ?? ''
  const signedIn = user !== null

  return (
    <>
      <SiteHeader user={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-20">
        <section className="py-12 sm:py-16">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-fg-muted">
            <span className="size-1.5 rounded-full bg-good" aria-hidden="true" />
            Prati cene sa ananas.rs
          </p>

          <h1 className="balance max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-[2.6rem]">
            Ne kupuj po punoj ceni.
          </h1>
          <p className="balance mt-3 max-w-xl text-[15px] leading-relaxed text-fg-muted">
            Pronađi proizvod, zaprati ga, i stiže ti mejl čim cena padne ili
            dostigne iznos koji si zadao. Besplatno za tri proizvoda.
          </p>

          <form method="get" role="search" className="mt-7 flex max-w-xl gap-2">
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="npr. laptop, espresso aparat, Dyson…"
              aria-label="Pretraga proizvoda"
              className="min-w-0 flex-1 rounded-card border border-line bg-surface px-4 py-2.5 text-sm shadow-[0_1px_2px_rgb(0_0_0/0.04)] outline-none transition-colors placeholder:text-fg-subtle focus:border-fg-muted"
            />
            <button
              type="submit"
              className="press shrink-0 rounded-card bg-fg px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
            >
              Traži
            </button>
          </form>
        </section>

        {query ? (
          // key: a new query must restart the boundary, not reuse the resolved one
          <Suspense key={query} fallback={<GridSkeleton count={8} label={`Tražim „${query}”…`} />}>
            <SearchResults query={query} signedIn={signedIn} />
          </Suspense>
        ) : (
          <Suspense fallback={<GridSkeleton count={12} label="Učitavam sniženja…" />}>
            <SaleSection signedIn={signedIn} />
          </Suspense>
        )}
      </main>
    </>
  )
}

/** Shared chrome so the search grid and the sale grid read as one system. */
function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-6">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {hint ? <p className="text-sm text-fg-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
  )
}

/**
 * The homepage without a query. Landing on a bare search box gives a visitor
 * nothing to do and nothing to judge the product by, so the sale listing runs
 * in its place — already-discounted items are also the ones most worth
 * watching.
 */
async function SaleSection({ signedIn }: { signedIn: boolean }) {
  let products
  try {
    products = await saleProducts()
  } catch (error) {
    console.error('[sale]', error)
    // A dead sale grid must not swallow the search box above it.
    return null
  }

  if (products.length === 0) return null

  const tracked = signedIn ? await activeTrackedUrls() : new Set<string>()

  return (
    <Section title="Trenutno na sniženju" hint="Sa ananas.rs, osvežava se na pola sata">
      <Grid>
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            action={
              <TrackButton
                product={product}
                signedIn={signedIn}
                alreadyTracked={tracked.has(product.url)}
              />
            }
          />
        ))}
      </Grid>
    </Section>
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
      <p
        role="alert"
        className="anim-rise rounded-card border border-line bg-surface p-6 text-sm text-danger"
      >
        {message}
      </p>
    )
  }

  if (products.length === 0) {
    return (
      <div className="anim-rise rounded-card border border-dashed border-line-strong p-10 text-center">
        <p className="text-sm text-fg-muted">
          Nema rezultata za <strong className="text-fg">{query}</strong>.
        </p>
        <p className="mt-1 text-sm text-fg-subtle">Probaj kraći ili opštiji pojam.</p>
      </div>
    )
  }

  const tracked = signedIn ? await activeTrackedUrls() : new Set<string>()

  return (
    <Section title={`Rezultati za „${query}”`} hint={`${products.length} proizvoda`}>
      <Grid>
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            action={
              <TrackButton
                product={product}
                signedIn={signedIn}
                alreadyTracked={tracked.has(product.url)}
              />
            }
          />
        ))}
      </Grid>
    </Section>
  )
}

function GridSkeleton({ count, label }: { count: number; label: string }) {
  return (
    <section>
      <div className="mb-4 border-t border-line pt-6">
        <p className="text-sm text-fg-muted">{label}</p>
      </div>
      <Grid>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="h-72 rounded-card border border-line bg-surface-2"
            aria-hidden="true"
          />
        ))}
      </Grid>
    </section>
  )
}
