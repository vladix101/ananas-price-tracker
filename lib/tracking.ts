import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { TrackedProduct } from '@/lib/database.types'

/**
 * Reads of the caller's tracked products. RLS scopes every query to the signed
 * in user (or to everything, for an admin), so none of these take a user id.
 */

/** URLs the user is currently tracking, for marking search results. */
export async function activeTrackedUrls(): Promise<Set<string>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tracked_products')
    .select('ananas_url')
    .eq('is_active', true)

  if (error) {
    // A failed lookup only costs a "Prati ovo" badge — never the whole page.
    console.error('[tracking] could not read tracked urls', error)
    return new Set()
  }

  return new Set(data.map((row) => row.ananas_url))
}

export type TrackedProductWithHistory = TrackedProduct & {
  price_history: Array<{ price: number; scraped_at: string }>
}

/** The dashboard list: active products, newest first, each with its history. */
export async function trackedProductsWithHistory(): Promise<TrackedProductWithHistory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tracked_products')
    .select('*, price_history(price, scraped_at)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .order('scraped_at', { referencedTable: 'price_history', ascending: true })

  if (error) throw new Error(`Ne mogu da učitam praćene proizvode: ${error.message}`)

  return (data ?? []) as TrackedProductWithHistory[]
}
