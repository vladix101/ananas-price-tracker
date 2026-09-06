import { formatPrice } from '@/lib/format'

type Point = { price: number; scraped_at: string }

const WIDTH = 240
const HEIGHT = 44
const PADDING = 4

/**
 * Price history as an inline SVG. Deliberately not a charting library: this is
 * one polyline, and shipping a runtime for it would cost more than it draws.
 *
 * Points are assumed to arrive oldest-first (the query orders them).
 */
export function PriceSparkline({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <p className="text-xs text-fg-subtle">
        {points.length === 0
          ? 'Još nema merenja — prvo stiže sa sledećim prolazom.'
          : 'Jedno merenje. Grafikon se crta od drugog.'}
      </p>
    )
  }

  const prices = points.map((p) => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  // A flat line would divide by zero; draw it through the middle instead.
  const span = max - min || 1

  const innerW = WIDTH - PADDING * 2
  const innerH = HEIGHT - PADDING * 2

  const coords = points.map((point, i) => {
    const x = PADDING + (i / (points.length - 1)) * innerW
    const y = PADDING + innerH - ((point.price - min) / span) * innerH
    return [x, y] as const
  })

  const first = points[0].price
  const last = points[points.length - 1].price
  const falling = last < first
  const direction = falling ? 'pao' : last > first ? 'porastao' : 'nepromenjen'
  const [lastX, lastY] = coords[coords.length - 1]

  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  // Close the path along the baseline so the area under it can be tinted.
  const area = `${line} ${(WIDTH - PADDING).toFixed(1)},${HEIGHT} ${PADDING},${HEIGHT}`

  return (
    <figure className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={`h-11 w-full max-w-60 ${falling ? 'text-good' : 'text-fg-muted'}`}
        role="img"
        aria-label={`Istorija cene, ${points.length} merenja, raspon ${formatPrice(min)}–${formatPrice(max)}, trend ${direction}.`}
      >
        <polygon points={area} fill="currentColor" opacity={0.08} />
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r={2.5} fill="currentColor" />
      </svg>
      <figcaption className="text-xs tabular-nums text-fg-subtle">
        {points.length} merenja · najniže {formatPrice(min)} · najviše {formatPrice(max)}
      </figcaption>
    </figure>
  )
}
