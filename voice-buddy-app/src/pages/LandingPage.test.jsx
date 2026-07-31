import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}))

import LandingPage from './LandingPage.jsx'

const renderLanding = () =>
  render(<MemoryRouter><LandingPage /></MemoryRouter>)

describe('LandingPage pricing honesty', () => {
  it('does not advertise features that are not implemented', () => {
    renderLanding()
    expect(screen.queryByText(/story mode/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/10 activity modes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/wake word/i)).not.toBeInTheDocument()
  })

  it('states the trial terms without implying a card is on file', () => {
    renderLanding()
    expect(screen.queryByText(/won't be charged/i)).not.toBeInTheDocument()
    // Appears in both the hero badge and the pricing card — assert presence,
    // not uniqueness.
    expect(screen.getAllByText(/no card needed/i).length).toBeGreaterThan(0)
  })
})
