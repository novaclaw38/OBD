import { supabase } from '../lib/supabase.js'

// Attach the current Supabase access token so the API can authenticate the user.
export async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function chatCompletion(messages, options = {}) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      messages,
      mode: options.mode,
      maxTokens: options.maxTokens || 300,
      temperature: options.temperature || 0.85,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    if (response.status === 429) throw new Error('RATE_LIMIT')
    if (err.error?.code === 'FREE_LIMIT_REACHED') throw new Error('FREE_LIMIT_REACHED')
    if (err.error?.code === 'PRO_REQUIRED') throw new Error('PRO_REQUIRED')
    throw new Error(err.error?.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('Malformed response from Buddy.')
  return content.trim()
}

// Uses a public ping endpoint — no Supabase auth required, just checks the Groq key works.
export async function testConnection() {
  const response = await fetch('/api/ping')
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${response.status}`)
  }
  return 'ok'
}
