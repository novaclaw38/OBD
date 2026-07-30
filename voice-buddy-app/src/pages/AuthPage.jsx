import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import styles from './AuthPage.module.css'
import { IconArrowLeft, IconEye, IconEyeOff } from '../components/icons.jsx'

export default function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [oauthLoading, setOauthLoading] = useState(false)

  const handleFacebookLogin = async () => {
    setError('')
    setOauthLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: window.location.origin + '/app' },
      })
      if (error) throw error
      // Browser redirects to Facebook; App.jsx picks up the session on return.
    } catch (err) {
      setError(err.message || 'Facebook login failed')
      setOauthLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setOauthLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/app' },
      })
      if (error) throw error
      // Browser redirects to Google; App.jsx picks up the session on return.
    } catch (err) {
      setError(err.message || 'Google login failed')
      setOauthLoading(false)
    }
  }

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Account created! Check your email to confirm, then log in.')
        setMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // App.jsx will detect the session change and redirect
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <button className={styles.home} onClick={() => navigate('/')}>
        <IconArrowLeft size={16} /> Home
      </button>
      <div className={styles.card}>
        {/* Bear logo */}
        <div className={styles.logo}>
          {(() => {
            const hiding = passwordFocused && !showPassword
            return (
          <svg viewBox="0 0 100 100" className={styles.bear}>
            <circle cx="22" cy="24" r="18" fill="#7c3aed" />
            <circle cx="78" cy="24" r="18" fill="#7c3aed" />
            <circle cx="22" cy="24" r="11" fill="rgba(255,190,190,0.45)" />
            <circle cx="78" cy="24" r="11" fill="rgba(255,190,190,0.45)" />
            <circle cx="50" cy="58" r="39" fill="#7c3aed" />
            <ellipse cx="50" cy="71" rx="17" ry="12" fill="rgba(255,255,255,0.18)" />
            {hiding ? (
              /* Eyes squeezed shut + paws over them — Buddy isn't peeking */
              <g className={styles.bearHide}>
                <path d="M 28 50 Q 35 55 42 50" stroke="#1e1b4b" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M 58 50 Q 65 55 72 50" stroke="#1e1b4b" strokeWidth="3" fill="none" strokeLinecap="round" />
                <circle cx="33" cy="52" r="10.5" fill="#6d31d9" />
                <circle cx="67" cy="52" r="10.5" fill="#6d31d9" />
                <circle cx="33" cy="52" r="6.5" fill="rgba(255,190,190,0.4)" />
                <circle cx="67" cy="52" r="6.5" fill="rgba(255,190,190,0.4)" />
              </g>
            ) : (
              <g>
                <circle cx="35" cy="50" r="9" fill="white" />
                <circle cx="37" cy="50" r="5" fill="#1e1b4b" />
                <circle cx="38" cy="48" r="2" fill="white" />
                <circle cx="65" cy="50" r="9" fill="white" />
                <circle cx="63" cy="50" r="5" fill="#1e1b4b" />
                <circle cx="64" cy="48" r="2" fill="white" />
              </g>
            )}
            <ellipse cx="50" cy="63" rx="5.5" ry="4" fill="rgba(0,0,0,0.35)" />
            <path d="M 38 72 Q 50 81 62 72" stroke="rgba(255,255,255,0.7)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="24" cy="65" r="9" fill="rgba(255,140,140,0.22)" />
            <circle cx="76" cy="65" r="9" fill="rgba(255,140,140,0.22)" />
          </svg>
            )
          })()}
        </div>

        <h1 className={styles.title}>Buddy</h1>
        <p className={styles.subtitle}>Your child's AI buddy</p>

        <div className={styles.modeTabs}>
          <button
            className={`${styles.modeTab} ${mode === 'login' ? styles.activeTab : ''}`}
            onClick={() => { setMode('login'); setError(''); setSuccess('') }}
          >Log In</button>
          <button
            className={`${styles.modeTab} ${mode === 'signup' ? styles.activeTab : ''}`}
            onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
          >Sign Up</button>
        </div>

        <form className={styles.form} onSubmit={handle}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-password">Password</label>
            <div className={styles.passwordWrap}>
              <input
                id="auth-password"
                className={styles.input}
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className={styles.eyeToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff size={19} /> : <IconEye size={19} />}
              </button>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.successMsg}>{success}</p>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <div className={styles.divider}><span>or</span></div>

        <div className={styles.oauthButtons}>
          <button className={styles.oauthBtn} onClick={handleGoogleLogin} disabled={oauthLoading} type="button">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5Z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4c-7.4 0-13.8 4.1-17.1 10.2Z" />
              <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.5 26.9 35.5 24 35.5c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.9 39.8 16.4 44 24 44Z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.6 5.6C42.6 35.6 44 30.1 44 24c0-1.3-.1-2.7-.4-3.5Z" />
            </svg>
            {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <button className={styles.oauthBtn} onClick={handleFacebookLogin} disabled={oauthLoading} type="button">
            <svg width="18" height="18" viewBox="0 0 36 36" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="#1877F2" />
              <path fill="#fff" d="M24.5 18h-4v11h-4.6V18h-2.9v-4h2.9v-2.6c0-3.5 1.7-5.6 5.7-5.6h3.4v4h-2.1c-1.6 0-1.7.6-1.7 1.7V14h3.9l-.6 4Z" />
            </svg>
            {oauthLoading ? 'Redirecting…' : 'Continue with Facebook'}
          </button>
        </div>

        <p className={styles.hint}>
          {mode === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            className={styles.switchBtn}
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
          >
            {mode === 'login' ? 'Sign up free' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
