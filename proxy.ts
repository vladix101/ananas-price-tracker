import type { NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/session'

// Next.js 16 renamed `middleware.ts` to `proxy.ts`; behaviour is unchanged.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files — those never carry a
     * session worth refreshing, and running on them wastes an auth round-trip.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
