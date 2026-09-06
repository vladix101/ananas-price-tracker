import 'server-only'

/**
 * Scrapes ananas.rs's own listing pages.
 *
 * Verified against the live site 2026-09-06:
 *   - /search?query=<term>  ("/pretraga" 404s, "?q=" 502s)
 *   - /akcija — the sale listing, same payload, used for the homepage grid
 *   - both are server-rendered and ship the full Algolia result set in a
 *     plain-JSON <script> block, so no headless browser is needed
 *   - robots.txt allows both; it disallows /en/, /sr/, /tmp/image-thumbnails/
 *     and /assets/, none of which this module requests
 */

const SEARCH_URL = 'https://ananas.rs/search'
const SALE_URL = 'https://ananas.rs/akcija'
const PRODUCT_BASE = 'https://ananas.rs/proizvod'
/**
 * Images live on a separate origin. Building them off https://ananas.rs 404s
 * on every single one — confirmed against og:image and the JSON-LD `image`
 * field on a product page, both of which point here.
 */
const ASSET_BASE = 'https://static.ananas.rs'

/**
 * A real browser UA. Sending a bot string here gets a different (JS-only) page
 * from their edge, which is precisely the situation we are avoiding.
 */
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const REQUEST_TIMEOUT_MS = 12_000

/**
 * Hard ceiling, not a display count. Both listings return 48 hits in a single
 * response, so returning all of them costs nothing extra — the caller decides
 * how many to show, and "pogledaj još" is then a slice, not another request.
 */
const MAX_RESULTS = 48

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
    thumbnailUrl?: unknown
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

  // Prefer the thumbnail: ~7 KB against ~56 KB for the full asset, and it is
  // never displayed larger than a grid cell. Twelve cards is the difference
  // between 80 KB and a megabyte on a phone.
  const thumb = typeof hit.product?.thumbnailUrl === 'string' ? hit.product.thumbnailUrl : null
  const cover = typeof hit.product?.coverImageUrl === 'string' ? hit.product.coverImageUrl : null
  const image = thumb ?? cover
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
    imageUrl: image ? `${ASSET_BASE}${image}` : null,
    brand: typeof hit.product?.brand === 'string' ? hit.product.brand : null,
    inStock: hit.onStock !== false,
  }
}

/**
 * Fetch one listing page and pull the products out of it.
 *
 * `revalidateSeconds` is a politeness lever as much as a speed one: every
 * visitor asking for the same page inside the window is served from Next's
 * cache instead of hitting ananas.rs again.
 */
async function fetchProducts(
  url: URL,
  revalidateSeconds: number,
): Promise<AnanasProduct[]> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'sr-RS,sr;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: revalidateSeconds },
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

/** Results for a user's search term. */
export async function searchAnanas(query: string): Promise<AnanasProduct[]> {
  const term = query.trim()
  if (!term) return []

  const url = new URL(SEARCH_URL)
  url.searchParams.set('query', term)

  // Short window: a shopper who searches twice in a minute wants the same
  // answer, but a price from an hour ago would be misleading.
  return fetchProducts(url, 300)
}

/**
 * The ananas.rs sale listing, shown on the homepage so a visitor who has not
 * searched yet still has something to track.
 *
 * Cached for half an hour: it is the same for everyone and the sale board does
 * not turn over by the minute.
 */
export async function saleProducts(): Promise<AnanasProduct[]> {
  return fetchProducts(new URL(SALE_URL), 1800)
}
