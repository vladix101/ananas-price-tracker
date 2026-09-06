/**
 * Fail loudly at the first use rather than letting Supabase construct a client
 * against `undefined` and surface it much later as an opaque fetch error.
 */
function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.local.example to .env.local and fill it in.`,
    )
  }
  return value
}

export const supabaseUrl = () => required('SUPABASE_URL')
export const supabasePublishableKey = () => required('SUPABASE_PUBLISHABLE_KEY')
