import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/lib/database.types'
import { supabasePublishableKey, supabaseUrl } from './env'

/** Supabase client for Client Components. Reads the session from cookies. */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey())
}
