/**
 * Environment access for the Supabase clients.
 *
 * Each variable is read through a *static* `process.env.NAME` expression. That
 * is not stylistic: Next.js substitutes these at build time by matching the
 * literal text, and `proxy.ts` compiles to the Edge runtime, where there is no
 * populated `process.env` object to fall back on. A dynamic lookup
 * (`process.env[name]`) leaves nothing to substitute, so every request through
 * the proxy throws — including ones for static pages.
 */
const VALUES = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
} as const

type VarName = keyof typeof VALUES

/** Fail loudly here rather than letting Supabase run against `undefined`. */
function required(name: VarName): string {
  const value = VALUES[name]
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Locally: copy .env.local.example to ` +
        `.env.local and fill it in. On Vercel: Settings -> Environment Variables, ` +
        `then redeploy — values are baked in at build time.`,
    )
  }
  return value
}

export const supabaseUrl = () => required('SUPABASE_URL')
export const supabasePublishableKey = () => required('SUPABASE_PUBLISHABLE_KEY')
