/**
 * ananas.rs quotes whole dinars, so no subunits are shown. Prices stored as
 * numeric(12,2) still arrive as e.g. 69999.00 — maximumFractionDigits: 0 keeps
 * both sources rendering identically.
 */
const rsd = new Intl.NumberFormat('sr-RS', {
  style: 'currency',
  currency: 'RSD',
  maximumFractionDigits: 0,
})

export function formatPrice(value: number): string {
  return rsd.format(value)
}

const dateTime = new Intl.DateTimeFormat('sr-RS', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDateTime(value: string | Date): string {
  return dateTime.format(typeof value === 'string' ? new Date(value) : value)
}
