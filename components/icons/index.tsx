/**
 * Inline SVGs rather than an icon package: the app needs five glyphs, and a
 * dependency for that ships a whole registry to save nothing.
 *
 * All are 16px, 1.5 stroke, currentColor — so they inherit text colour and sit
 * on the text baseline without per-use tuning.
 */

type Props = { className?: string }

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function IconBookmark({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export function IconExternal({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  )
}

export function IconSearch({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function IconBell({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}

export function IconTrendDown({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M22 17 13.5 8.5l-5 5L2 7" />
      <path d="M16 17h6v-6" />
    </svg>
  )
}
