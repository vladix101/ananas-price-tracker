import { formatPrice } from '@/lib/format'

type Point = { price: number; scraped_at: string }

const WIDTH = 240
const HEIGHT = 48
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
      <p className="text-xs text-neutral-400">
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
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const last = points[points.length - 1]
  const first = points[0]
  const direction = last.price < first.price ? 'pao' : last.price > first.price ? 'porastao' : 'nepromenjen'

  return (
    <figure className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-12 w-full max-w-60 text-neutral-900 dark:text-neutral-100"
        role="img"
        aria-label={`Istorija cene, ${points.length} merenja, raspon ${formatPrice(min)}–${formatPrice(max)}, trend ${direction}.`}
      >
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={coords[coords.length - 1].split(',')[0]}
          cy={coords[coords.length - 1].split(',')[1]}
          r={2.5}
          fill="currentColor"
        />
      </svg>
      <figcaption className="text-xs text-neutral-400">
        {points.length} merenja · najniže {formatPrice(min)} · najviše {formatPrice(max)}
      </figcaption>
    </figure>
  )
}
