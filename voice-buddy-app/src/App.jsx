import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase.js'
import { SubscriptionProvider } from './hooks/useSubscription.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { authHeaders } from './services/chatService.js'

const ChildPage   = lazy(() => import('./pages/ChildPage.jsx'))
const ParentPage  = lazy(() => import('./pages/ParentPage.jsx'))
const AuthPage    = lazy(() => import('./pages/AuthPage.jsx'))
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'))
const CoursesPage = lazy(() => import('./pages/CoursesPage.jsx'))
const LessonPage  = lazy(() => import('./pages/LessonPage.jsx'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage.jsx'))
const DataDeletionPage  = lazy(() => import('./pages/DataDeletionPage.jsx'))

const Loader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#030712' }}>
    <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif' }}>Loading…</div>
  </div>
)

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session
      setSession(s)
      // Provision trial row for new users
      if (s?.user) ensureSubscription()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s?.user) ensureSubscription()
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <Loader />
  }

  return (
    <BrowserRouter>
      <SubscriptionProvider userId={session?.user?.id}>
        <ErrorBoundary>
        <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public */}
          <Route path="/"      element={session ? <Navigate to="/app" replace /> : <LandingPage />} />
          <Route path="/login" element={session ? <Navigate to="/app" replace /> : <AuthPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/data-deletion" element={<DataDeletionPage />} />

          {/* Authenticated */}
          <Route path="/app"     element={session ? <ChildPage session={session} />  : <Navigate to="/" replace />} />
          <Route path="/parent"  element={session ? <ParentPage session={session} /> : <Navigate to="/" replace />} />
          <Route path="/courses" element={session ? <CoursesPage session={session} /> : <Navigate to="/" replace />} />
          <Route path="/lesson"  element={session ? <LessonPage session={session} /> : <Navigate to="/" replace />} />

          <Route path="/dev-child" element={<ChildPage session={{ user: { id: 'dev-preview' } }} />} />
          <Route path="/dev-courses" element={<CoursesPage session={{ user: { id: 'dev-preview' } }} />} />
          <Route path="/dev-parent" element={<ParentPage session={{ user: { id: 'dev-preview' } }} />} />
          <Route path="/dev-lesson" element={<LessonPage session={{ user: { id: 'dev-preview' } }} />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={session ? '/app' : '/'} replace />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </SubscriptionProvider>
    </BrowserRouter>
  )
}

// Trial rows are provisioned server-side (service key) so a client can never
// mint or extend its own entitlement. Idempotent; safe to call on every load.
let ensureTrialDone = false
async function ensureSubscription() {
  if (ensureTrialDone) return
  ensureTrialDone = true
  try {
    const res = await fetch('/api/ensure-trial', { method: 'POST', headers: await authHeaders() })
    if (!res.ok) ensureTrialDone = false
  } catch {
    ensureTrialDone = false // network hiccup — retry on next auth event
  }
}
