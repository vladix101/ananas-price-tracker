'use server'

import { revalidatePath } from 'next/cache'

import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type TrackState = {
  error?: string
  /** Set on success so the button can show a settled state. */
  tracked?: boolean
}

/** Raised by enforce_tracking_limit. */
const LIMIT_ERROR = 'free_plan_limit_reached'
/** Postgres unique_violation — the (user_id, ananas_url) index. */
const UNIQUE_VIOLATION = '23505'

/**
 * How many products the free plan allows.
 *
 * Read from the database rather than duplicated here, so the trigger and this
 * message can never disagree. Only called on the error path, so the extra
 * round-trip costs nothing in the normal case.
 */
async function freePlanLimit(): Promise<number | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('free_plan_limit')
  return typeof data === 'number' ? data : null
}

export async function trackProduct(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const user = await requireUser()

  const productName = String(formData.get('product_name') ?? '').trim()
  const ananasUrl = String(formData.get('ananas_url') ?? '').trim()
  const rawPrice = String(formData.get('current_price') ?? '')
  const currentPrice = rawPrice ? Number(rawPrice) : null

  if (!productName || !ananasUrl.startsWith('https://ananas.rs/proizvod/')) {
    return { error: 'Neispravan proizvod.' }
  }

  const supabase = await createClient()

  // The row may already exist and be paused — "Prati ovo" then means "resume".
  // onConflict targets the (user_id, ananas_url) unique index; the limit
  // trigger fires on that UPDATE too, so reactivating cannot exceed the plan.
  const { error } = await supabase.from('tracked_products').upsert(
    {
      user_id: user.id,
      product_name: productName,
      ananas_url: ananasUrl,
      current_price: Number.isFinite(currentPrice) ? currentPrice : null,
      is_active: true,
    },
    { onConflict: 'user_id,ananas_url' },
  )

  if (error) {
    if (error.message.includes(LIMIT_ERROR)) {
      const limit = await freePlanLimit()
      return {
        error: limit
          ? `Besplatan nalog može da prati najviše ${limit} proizvoda. Prestani da pratiš neki drugi ili nadogradi nalog.`
          : 'Dostigao si limit besplatnog naloga.',
      }
    }

    if (error.code === UNIQUE_VIOLATION) {
      return { error: 'Već pratiš ovaj proizvod.' }
    }

    console.error('[track] insert failed', error)
    return { error: 'Nije uspelo. Pokušaj ponovo.' }
  }

  revalidatePath('/')
  revalidatePath('/dashboard')
  return { tracked: true }
}

export async function stopTracking(formData: FormData): Promise<void> {
  await requireUser()

  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  const supabase = await createClient()

  // Paused, not deleted: price_history stays, and resuming later keeps the
  // chart continuous. RLS restricts this to the caller's own rows.
  const { error } = await supabase
    .from('tracked_products')
    .update({ is_active: false })
    .eq('id', id)

  if (error) console.error('[track] stop failed', error)

  revalidatePath('/dashboard')
}

export async function setTargetPrice(formData: FormData): Promise<void> {
  await requireUser()

  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  const raw = String(formData.get('target_price') ?? '').trim()
  const target = raw === '' ? null : Number(raw)

  if (target !== null && (!Number.isFinite(target) || target <= 0)) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('tracked_products')
    .update({ target_price: target })
    .eq('id', id)

  if (error) console.error('[track] target price failed', error)

  revalidatePath('/dashboard')
}
