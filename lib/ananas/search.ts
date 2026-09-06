import 'server-only'

/**
 * Scrapes ananas.rs's own search results page.
 *
 * Verified against the live site 2026-09-06:
 *   - /search?query=<term>  ("/pretraga" 404s, "?q=" 502s)
 *   - the page is server-rendered and ships the full Algolia result set in a
 *     plain-JSON <script> block, so no headless browser is needed
 *   - robots.txt allows /search; it disallows /en/, /sr/, /tmp/image-thumbnails/
 *     and /assets/, none of which this module requests
 */

const SEARCH_URL = 'https://ananas.rs/search'
const PRODUCT_BASE = 'https://ananas.rs/proizvod'
const ASSET_BASE = 'https://ananas.rs'

/**
 * A real browser UA. Sending a bot string here gets a different (JS-only) page
 * from their edge, which is precisely the situation we are avoiding.
 */
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const REQUEST_TIMEOUT_MS = 12_000
const MAX_RESULTS = 24

/**
 * The results are handed to the browser as an assignment to a Symbol-keyed
 * global, not as JSON inside a data attribute — so it has to be located by
 * marker and brace-matched out of the surrounding script.
 */
const RESULTS_MARKER = 'window[Symbol.for("InstantSearchInitialResults")] = '

export type AnanasProduct = {
  /** ananas.rs product id; also the last URL segment. */
  id: string
  name: string
  url: string
  /** Current price in RSD. Whole dinars — ananas.rs quotes no subunits. */
  price: number
  /** Pre-discount price, when the item is on sale. */
  basePrice: number | null
  discountPercentage: number
  imageUrl: string | null
  brand: string | null
  inStock: boolean
}

/** Thrown for every failure mode so callers have one thing to catch. */
export class AnanasScrapeError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AnanasScrapeError'
  }
}

/**
 * Reads one balanced `{...}` starting at `from`, honouring string literals and
 * backslash escapes.
 *
 * A regex cannot do this: product names legitimately contain braces, and screen
 * sizes contain an escaped inch mark (`15.3\"`) that naive unescaping splits the
 * JSON on.
 */
function extractJsonObject(source: string, from: number): string {
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = from; i < source.length; i++) {
    const char = source[i]

    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }

    if (char === '"') inString = true
    else if (char === '{') depth++
    else if (char === '}') {
      depth--
      if (depth === 0) return source.slice(from, i + 1)
    }
  }

  throw new AnanasScrapeError('Nezatvoren JSON blok u HTML-u pretrage.')
}

/** Shape of one Algolia hit. Only the fields this app reads are declared. */
type AlgoliaHit = {
  objectID?: unknown
  price?: unknown
  basePrice?: unknown
  discountPercentage?: unknown
  onStock?: unknown
  product?: {
    name?: unknown
    slug?: unknown
    coverImageUrl?: unknown
    brand?: unknown
  }
}

function toProduct(hit: AlgoliaHit): AnanasProduct | null {
  const id = typeof hit.objectID === 'string' ? hit.objectID : null
  const name = typeof hit.product?.name === 'string' ? hit.product.name : null
  const slug = typeof hit.product?.slug === 'string' ? hit.product.slug : null
  const price = typeof hit.price === 'number' ? hit.price : null

  // A hit without these cannot be tracked, so it is not worth showing.
  if (!id || !name || !slug || price === null) return null

  const cover = typeof hit.product?.coverImageUrl === 'string' ? hit.product.coverImageUrl : null
  const basePrice = typeof hit.basePrice === 'number' ? hit.basePrice : null

  return {
    id,
    name,
    url: `${PRODUCT_BASE}/${slug}/${id}`,
    price,
    // only meaningful when it is actually above the current price
    basePrice: basePrice !== null && basePrice > price ? basePrice : null,
    discountPercentage:
      typeof hit.discountPercentage === 'number' ? hit.discountPercentage : 0,
    imageUrl: cover ? `${ASSET_BASE}${cover}` : null,
    brand: typeof hit.product?.brand === 'string' ? hit.product.brand : null,
    inStock: hit.onStock !== false,
  }
}

export async function searchAnanas(query: string): Promise<AnanasProduct[]> {
  const term = query.trim()
  if (!term) return []

  const url = new URL(SEARCH_URL)
  url.searchParams.set('query', term)

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'sr-RS,sr;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Their prices move; a stale cached search would defeat the point.
      cache: 'no-store',
    })
  } catch (cause) {
    throw new AnanasScrapeError('Ananas.rs se ne javlja.', { cause })
  }

  if (!response.ok) {
    throw new AnanasScrapeError(`Ananas.rs je vratio ${response.status}.`)
  }

  const html = await response.text()
  const markerAt = html.indexOf(RESULTS_MARKER)

  if (markerAt === -1) {
    // Either zero results, or they changed the page. Distinguishing the two
    // matters: the second means this parser needs updating.
    throw new AnanasScrapeError(
      'Nisam našao rezultate u HTML-u — ananas.rs je verovatno promenio stranicu pretrage.',
    )
  }

  let payload: unknown
  try {
    payload = JSON.parse(extractJsonObject(html, markerAt + RESULTS_MARKER.length))
  } catch (cause) {
    throw new AnanasScrapeError('Rezultati pretrage nisu ispravan JSON.', { cause })
  }

  // Keyed by Algolia index name (currently "prod_merchant_inventories_sr").
  // Reading the first key rather than hardcoding it survives a rename.
  const firstIndex = Object.values(payload as Record<string, unknown>)[0] as
    | { results?: Array<{ hits?: unknown }> }
    | undefined

  const hits = firstIndex?.results?.[0]?.hits

  if (!Array.isArray(hits)) return []

  return hits
    .slice(0, MAX_RESULTS)
    .map((hit) => toProduct(hit as AlgoliaHit))
    .filter((product): product is AnanasProduct => product !== null)
}
