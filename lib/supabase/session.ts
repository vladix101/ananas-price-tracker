import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import type { Database } from '@/lib/database.types'
import { supabasePublishableKey, supabaseUrl } from './env'

/** Signed-in users are bounced away from these. */
const AUTH_ROUTES = ['/login', '/signup']

/** Signed-out users are bounced away from these (prefix match). */
const PROTECTED_ROUTES = ['/dashboard']

/**
 * Refreshes the Supabase auth token on every request and writes the rotated
 * cookies onto the outgoing response, then does a cheap route guard.
 *
 * The response object below has to be the one that is returned: `setAll`
 * rebuilds it so the refreshed cookies ride along. Returning a different
 * NextResponse silently logs the user out on token rotation.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // getUser(), not getSession(): it revalidates the token with the auth server
  // instead of trusting a cookie the client could have forged.
  //
  // A Supabase outage makes this reject. Since this runs on every request,
  // letting it throw would 500 the whole site — including pages that need no
  // session at all. Degrade to "anonymous" instead: the guard below then fails
  // closed, sending would-be users to /login rather than past it.
  let user = null
  try {
    ;({
      data: { user },
    } = await supabase.auth.getUser())
  } catch (cause) {
    console.error('[proxy] session refresh failed, treating request as anonymous', cause)
  }

  const { pathname } = request.nextUrl

  if (!user && PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
