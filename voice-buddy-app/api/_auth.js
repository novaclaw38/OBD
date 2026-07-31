import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_KEY

// Modes any signed-in user may use without a subscription.
const FREE_MODES = new Set(['chat', 'sing'])

function db() {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not configured')
  }
  return createClient(supabaseUrl, serviceKey)
}

// Returns the authenticated Supabase user for a request, or null.
export async function getUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    const { data, error } = await db().auth.getUser(token)
    if (error || !data?.user) return null
    return data.user
  } catch {
    return null
  }
}

export function isProMode(mode) {
  return !FREE_MODES.has(mode || 'chat')
}

// True if the user currently has an active trial or paid subscription.
export async function isEntitled(userId) {
  if (!userId) return false
  try {
    const { data } = await db()
      .from('subscriptions')
      .select('status, trial_end, subscription_end')
      .eq('user_id', userId)
      .maybeSingle()
    if (!data) return false
    const now = Date.now()
    if (data.status === 'trial'  && data.trial_end        && new Date(data.trial_end).getTime()        > now) return true
    if (data.status === 'active' && data.subscription_end && new Date(data.subscription_end).getTime() > now) return true
    return false
  } catch {
    return false
  }
}

// Per-user fixed-window rate limit backed by the bump_api_usage RPC
// (supabase/migrations/2026-07-04-api-rate-limits.sql). Returns true if the
// request is allowed. Fails open on infrastructure errors — the limit is a
// cost guard, not a security boundary.
export async function allowRequest(userId, endpoint, limit, windowSeconds) {
  try {
    const { data, error } = await db().rpc('bump_api_usage', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      console.error('rate limit RPC failed:', error.message)
      return true
    }
    return data <= limit
  } catch (err) {
    console.error('rate limit check failed:', err.message)
    return true
  }
}
