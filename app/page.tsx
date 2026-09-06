import { Suspense } from 'react'

import { ProductCard } from '@/components/product-card'
import { HowItWorks } from '@/components/how-it-works'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { IconSearch } from '@/components/icons'
import { TrackButton } from '@/components/track-button'
import { getCurrentUser } from '@/lib/auth'
import { AnanasScrapeError, saleProducts, searchAnanas } from '@/lib/ananas/search'
import { activeTrackedUrls } from '@/lib/tracking'

type SearchParams = Promise<{ q?: string; vise?: string }>

/**
 * How many products each grid shows before "pogledaj još".
 *
 * Both listings arrive 48-at-a-time in one cached response, so expanding is a
 * bigger slice of data we already hold — no second request to ananas.rs.
 */
const INITIAL_SALE = 12
const INITIAL_SEARCH = 24

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const [user, { q, vise }] = await Promise.all([getCurrentUser(), searchParams])
  const query = q?.trim() ?? ''
  const signedIn = user !== null
  const expanded = vise === '1'

  return (
    <>
      <SiteHeader user={user} />

      <main className="pb-safe mx-auto w-full max-w-6xl flex-1 px-4 sm:px-5">
        <section className="py-8 sm:py-16">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1.5 pr-3 text-xs font-medium text-fg-muted">
            <span className="rounded-full bg-good-soft px-2 py-0.5 text-[11px] font-semibold text-good">
              Besplatno
            </span>
            do 3 proizvoda
          </p>

          <h1 className="balance max-w-2xl text-[2rem] font-semibold leading-[1.1] tracking-tight sm:text-[2.75rem]">
            Ne kupuj po punoj ceni.
          </h1>
          <p className="balance mt-3.5 max-w-lg text-[15px] leading-relaxed text-fg-muted sm:text-base">
            Zaprati bilo koji proizvod sa ananas.rs. Proveravamo cenu na svakih
            šest sati i šaljemo ti mejl čim padne.
          </p>

          <form method="get" role="search" className="mt-6 flex max-w-xl gap-2 sm:mt-7">
            <div className="relative flex min-w-0 flex-1 items-center">
              <IconSearch className="pointer-events-none absolute left-3.5 text-fg-subtle" />
              <input
                name="q"
                type="search"
                defaultValue={query}
                placeholder="laptop, espresso aparat, Dyson…"
                aria-label="Pretraga proizvoda"
                enterKeyHint="search"
                autoCapitalize="none"
                autoCorrect="off"
                className="tap w-full rounded-xl border border-line bg-surface pl-10 pr-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] outline-none transition-colors placeholder:text-fg-subtle focus:border-fg-muted focus:shadow-[0_0_0_3px_rgb(24_24_27/0.06)]"
              />
            </div>
            <button
              type="submit"
              className="press tap shrink-0 rounded-xl bg-fg px-5 text-sm font-medium text-bg transition-opacity sm:hover:opacity-90"
            >
              Traži
            </button>
          </form>
        </section>

        {!query && !signedIn ? (
          <div className="pb-9 sm:pb-12">
            <HowItWorks />
          </div>
        ) : null}

        {query ? (
          // key: a new query must restart the boundary, not reuse the resolved one
          <Suspense key={`${query}-${expanded}`} fallback={<GridSkeleton count={8} label={`Tražim „${query}”…`} />}>
            <SearchResults query={query} signedIn={signedIn} expanded={expanded} />
          </Suspense>
        ) : (
          <Suspense fallback={<GridSkeleton count={12} label="Učitavam sniženja…" />}>
            <SaleSection signedIn={signedIn} expanded={expanded} />
          </Suspense>
        )}
      </main>

      <SiteFooter />
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
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-5 sm:mb-4 sm:pt-6">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
        {hint ? <p className="text-sm text-fg-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

/**
 * A plain link, not a button with client state: it keeps the expanded view
 * shareable and bookmarkable, works without JavaScript, and needs no
 * "loading" state because nothing is fetched.
 */
function ShowMore({ href, remaining }: { href: string; remaining: number }) {
  return (
    <div className="mt-7 flex justify-center">
      <a
        href={href}
        className="press tap inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 text-sm font-medium transition-colors sm:hover:border-line-strong sm:hover:bg-surface-2"
      >
        Pogledaj još {remaining}
        <span aria-hidden="true">↓</span>
      </a>
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4">
      {children}
    </div>
  )
}

/**
 * The homepage without a query. Landing on a bare search box gives a visitor
 * nothing to do and nothing to judge the product by, so the sale listing runs
 * in its place — already-discounted items are also the ones most worth
 * watching.
 */
async function SaleSection({ signedIn, expanded }: { signedIn: boolean; expanded: boolean }) {
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
  const shown = expanded ? products : products.slice(0, INITIAL_SALE)
  const remaining = products.length - shown.length

  return (
    <Section title="Trenutno na sniženju" hint="sa ananas.rs">
      <Grid>
        {shown.map((product, index) => (
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
      {remaining > 0 ? <ShowMore href="/?vise=1" remaining={remaining} /> : null}
    </Section>
  )
}

async function SearchResults({
  query,
  signedIn,
  expanded,
}: {
  query: string
  signedIn: boolean
  expanded: boolean
}) {
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
  const shown = expanded ? products : products.slice(0, INITIAL_SEARCH)
  const remaining = products.length - shown.length

  return (
    <Section
      title={`Rezultati za „${query}”`}
      hint={`${shown.length} od ${products.length}`}
    >
      <Grid>
        {shown.map((product, index) => (
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
      {remaining > 0 ? (
        <ShowMore
          href={`/?q=${encodeURIComponent(query)}&vise=1`}
          remaining={remaining}
        />
      ) : null}
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
            className="h-64 rounded-card border border-line bg-surface-2 sm:h-72"
            aria-hidden="true"
          />
        ))}
      </Grid>
    </section>
  )
}
