import { getUser, isProMode, isEntitled, allowRequest } from './_auth.js'

const MAX_HISTORY = 17 // 1 system prompt + up to 16 turns, matches client's MAX_HISTORY
const MAX_MESSAGE_CHARS = 4000
const MAX_TOKENS_CAP = 800
const RATE_LIMIT_PER_MIN = 20
const RATE_LIMIT_PER_DAY = 500
const FREE_CHAT_LIMIT_PER_DAY = 10 // matches the "Chat with Buddy (10/day)" free-plan claim on the pricing page

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Require a signed-in user — this endpoint spends paid Groq credits.
  const user = await getUser(req)
  if (!user) {
    return res.status(401).json({ error: { message: 'Sign in to chat with Buddy.' } })
  }

  // Cost guard: cap how fast and how much any one account can spend.
  if (!(await allowRequest(user.id, 'chat-1m', RATE_LIMIT_PER_MIN, 60)) ||
      !(await allowRequest(user.id, 'chat-1d', RATE_LIMIT_PER_DAY, 86400))) {
    return res.status(429).json({ error: { message: 'Too many requests — take a short break.' } })
  }

  const { messages, maxTokens = 300, temperature = 0.85, mode } = req.body

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_HISTORY) {
    return res.status(400).json({ error: { message: 'Invalid messages payload.' } })
  }
  for (const m of messages) {
    if (!m || typeof m.content !== 'string' || m.content.length > MAX_MESSAGE_CHARS ||
        !['system', 'user', 'assistant'].includes(m.role)) {
      return res.status(400).json({ error: { message: 'Invalid message payload.' } })
    }
  }

  const clampedMaxTokens = Math.min(Math.max(1, Number(maxTokens) || 300), MAX_TOKENS_CAP)
  const clampedTemperature = Math.min(Math.max(0, Number(temperature) || 0.85), 2)

  // Enforce Pro gating server-side — the client cannot be trusted.
  const entitled = await isEntitled(user.id)
  if (isProMode(mode) && !entitled) {
    return res.status(403).json({ error: { message: 'This mode is part of Buddy Pro.', code: 'PRO_REQUIRED' } })
  }

  // Free-tier daily message cap — the one thing that's supposed to make
  // free chat/story/sing "10/day" rather than unlimited.
  if (!entitled) {
    const withinFreeLimit = await allowRequest(user.id, 'chat-free-1d', FREE_CHAT_LIMIT_PER_DAY, 86400)
    if (!withinFreeLimit) {
      return res.status(403).json({ error: { message: "You've used today's free chats with Buddy.", code: 'FREE_LIMIT_REACHED' } })
    }
  }

  const key = process.env.GROQ_API_KEY
  if (!key) {
    return res.status(500).json({ error: { message: 'GROQ_API_KEY not set in Vercel environment variables' } })
  }

  const MODELS = [
    'llama-3.1-8b-instant',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'llama-3.3-70b-versatile',
  ]

  for (let i = 0; i < MODELS.length; i++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20000)
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODELS[i],
          messages,
          max_tokens: clampedMaxTokens,
          temperature: clampedTemperature,
        }),
        signal: ctrl.signal,
      })

      if (response.status === 429 && i < MODELS.length - 1) continue

      const data = await response.json()

      if (!response.ok) {
        if (i < MODELS.length - 1) continue
        return res.status(response.status).json(data)
      }

      return res.status(200).json(data)
    } catch (err) {
      if (i < MODELS.length - 1) continue
      return res.status(500).json({ error: { message: err.message } })
    } finally {
      clearTimeout(timer)
    }
  }
}
