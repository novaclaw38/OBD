import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  allowRequest: vi.fn(),
  isEntitled: vi.fn(),
}))
vi.mock('./_auth.js', () => mocks)

import handler from './tts.js'

function mockRes() {
  const res = { statusCode: 0, body: null, headers: {} }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  res.send = (b) => { res.body = b; return res }
  res.setHeader = (k, v) => { res.headers[k] = v }
  return res
}

const req = { method: 'POST', headers: {}, body: { text: 'hello' } }

describe('api/tts daily caps by entitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ id: 'u1' })
    mocks.allowRequest.mockResolvedValue(true)
    process.env.GOOGLE_TTS_KEY = 'test-key'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audioContent: Buffer.from('audio').toString('base64') }),
    })
  })

  it('caps a free user at 60 calls per day', async () => {
    mocks.isEntitled.mockResolvedValue(false)
    await handler(req, mockRes())
    expect(mocks.allowRequest).toHaveBeenCalledWith('u1', 'tts-1d', 60, 86400)
  })

  it('allows an entitled user 1000 calls per day', async () => {
    mocks.isEntitled.mockResolvedValue(true)
    await handler(req, mockRes())
    expect(mocks.allowRequest).toHaveBeenCalledWith('u1', 'tts-1d', 1000, 86400)
  })

  it('returns 429 once the daily cap is exceeded', async () => {
    mocks.isEntitled.mockResolvedValue(false)
    mocks.allowRequest.mockResolvedValue(false)
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(429)
  })
})
