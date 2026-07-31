import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isEntitled: vi.fn(),
}))
vi.mock('./_auth.js', () => mocks)

import handler from './lesson.js'

function mockRes() {
  const res = { statusCode: 0, body: null, headers: {} }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  res.setHeader = (k, v) => { res.headers[k] = v }
  return res
}

const req = (query) => ({ method: 'GET', headers: {}, query })

describe('api/lesson entitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ id: 'u1' })
  })

  it('rejects an anonymous request with 401', async () => {
    mocks.getUser.mockResolvedValue(null)
    const res = mockRes()
    await handler(req({ course: 'literacy', lesson: 'blending-sounds' }), res)
    expect(res.statusCode).toBe(401)
  })

  it('rejects a signed-in free user with 403 PRO_REQUIRED', async () => {
    mocks.isEntitled.mockResolvedValue(false)
    const res = mockRes()
    await handler(req({ course: 'literacy', lesson: 'blending-sounds' }), res)
    expect(res.statusCode).toBe(403)
    expect(res.body.error.code).toBe('PRO_REQUIRED')
  })

  it('returns the full lesson with steps to an entitled user', async () => {
    mocks.isEntitled.mockResolvedValue(true)
    const res = mockRes()
    await handler(req({ course: 'literacy', lesson: 'blending-sounds' }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.lesson.title).toBe('Blending Sounds')
    expect(res.body.lesson.steps.length).toBeGreaterThan(0)
  })

  it('404s an unknown lesson for an entitled user', async () => {
    mocks.isEntitled.mockResolvedValue(true)
    const res = mockRes()
    await handler(req({ course: 'literacy', lesson: 'nope' }), res)
    expect(res.statusCode).toBe(404)
  })
})
