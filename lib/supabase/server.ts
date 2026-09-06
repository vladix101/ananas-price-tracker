import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import type { Database } from '@/lib/database.types'
import { supabasePublishableKey, supabaseUrl } from './env'

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Always create a fresh one per request — never hoist it to a module-level
 * constant, or one visitor's session leaks into another's render.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components may not set cookies. proxy.ts refreshes the
          // session on every request, so dropping the write here is safe.
        }
      },
    },
  })
}
