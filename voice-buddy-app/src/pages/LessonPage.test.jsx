import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mutable so each test can flip entitlement before rendering.
const mockSub = { isPro: false, loading: false, tier: 'free', daysLeft: null, refresh: vi.fn() }

vi.mock('../hooks/useSubscription.jsx', () => ({
  useSubscription: () => mockSub,
  SubscriptionProvider: ({ children }) => children,
}))

vi.mock('../hooks/useSpeech.js', () => ({
  useSpeech: () => ({
    speak: vi.fn(), stopSpeaking: vi.fn(),
    startListening: vi.fn(), stopListening: vi.fn(),
    status: 'idle', transcript: '', voices: [],
    supported: { stt: true, tts: true },
    audioRef: { current: null }, boundaryWordRef: { current: -1 },
  }),
}))

vi.mock('../hooks/useProgress.js', () => ({
  useProgress: () => ({ completions: new Set(), records: new Map(), markComplete: vi.fn() }),
  masteryTier: () => 'gold',
}))

// UpgradePrompt imports the real supabase client, which needs env vars.
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}))

import LessonPage from './LessonPage.jsx'

const renderLesson = () =>
  render(
    <MemoryRouter initialEntries={['/lesson?course=literacy&lesson=blending-sounds']}>
      <LessonPage session={{ user: { id: 'u1' } }} />
    </MemoryRouter>
  )

describe('LessonPage entitlement gate', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows the upgrade prompt and no lesson content to a free user', () => {
    mockSub.isPro = false
    renderLesson()
    expect(screen.getByText(/Unlock All Courses/i)).toBeInTheDocument()
    expect(screen.queryByText(/Blending Sounds/i)).not.toBeInTheDocument()
  })

  it('renders lesson content for an entitled user', () => {
    mockSub.isPro = true
    renderLesson()
    expect(screen.getByText(/Blending Sounds/i)).toBeInTheDocument()
    expect(screen.queryByText(/Unlock All Courses/i)).not.toBeInTheDocument()
  })
})
