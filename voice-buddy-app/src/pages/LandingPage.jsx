import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'
import {
  IconSparkle, IconCamera, IconLock, IconBolt, IconMic, IconMail, IconHeart,
  IconBook, IconMusic, IconCheck, IconX, IconPlay, IconShield,
} from '../components/icons.jsx'

// Floating particle field
function Particles({ count = 36 }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 6,
    duration: Math.random() * 8 + 6,
  }))
  return (
    <div className={styles.particles} aria-hidden="true">
      {particles.map(p => (
        <span
          key={p.id}
          className={styles.particle}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

// Bear SVG (reused from auth, enhanced with glow)
function BuddyHero() {
  return (
    <div className={styles.buddyWrap}>
      <div className={styles.buddyGlow} />
      <div className={styles.buddyRing} />
      <svg viewBox="0 0 100 100" className={styles.buddySvg}>
        <circle cx="22" cy="24" r="18" fill="#7c3aed" />
        <circle cx="78" cy="24" r="18" fill="#7c3aed" />
        <circle cx="22" cy="24" r="11" fill="rgba(255,190,190,0.45)" />
        <circle cx="78" cy="24" r="11" fill="rgba(255,190,190,0.45)" />
        <circle cx="50" cy="58" r="39" fill="#7c3aed" />
        <ellipse cx="50" cy="71" rx="17" ry="12" fill="rgba(255,255,255,0.18)" />
        {/* Eyes with glow */}
        <circle cx="35" cy="50" r="9" fill="white" />
        <circle cx="37" cy="50" r="5" fill="#1e1b4b" />
        <circle className={styles.eyeGlow} cx="38" cy="48" r="2" fill="white" />
        <circle cx="65" cy="50" r="9" fill="white" />
        <circle cx="63" cy="50" r="5" fill="#1e1b4b" />
        <circle className={styles.eyeGlow} cx="64" cy="48" r="2" fill="white" />
        <ellipse cx="50" cy="63" rx="5.5" ry="4" fill="rgba(0,0,0,0.35)" />
        <path d="M 38 72 Q 50 81 62 72" stroke="rgba(255,255,255,0.7)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="65" r="9" fill="rgba(255,140,140,0.22)" />
        <circle cx="76" cy="65" r="9" fill="rgba(255,140,140,0.22)" />
      </svg>
      {/* Speech bubble — hints at the real product experience, not just the mascot */}
      <div className={styles.heroBubble}>
        Hi! Want to hear a story about a cloud kingdom? ✨
      </div>
    </div>
  )
}

// Animated waveform for voice section
function Waveform() {
  return (
    <svg viewBox="0 0 200 60" className={styles.waveform} aria-hidden="true">
      {[10, 25, 40, 55, 70, 85, 100, 115, 130, 145, 160, 175, 190].map((x, i) => (
        <rect
          key={i}
          x={x - 3}
          y={30 - (i % 3 === 0 ? 22 : i % 3 === 1 ? 14 : 8)}
          width="6"
          height={i % 3 === 0 ? 44 : i % 3 === 1 ? 28 : 16}
          rx="3"
          fill="rgba(168,85,247,0.7)"
          className={styles.bar}
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </svg>
  )
}

// Phone mockup for camera section — a real screenshot of the child screen,
// framed as the live view a parent sees from the dashboard.
function PhoneMockup() {
  return (
    <div className={styles.phone}>
      <div className={styles.phoneScreen}>
        <img
          className={styles.screenShot}
          src="/screenshots/child-home.webp"
          alt="Live view of the Buddy child screen"
          loading="lazy"
          width="390"
          height="625"
        />
        <div className={styles.cameraOverlay}>
          <span className={styles.liveTag}>● LIVE</span>
          <span className={styles.childTag}>Sam</span>
        </div>
      </div>
      <div className={styles.phoneNotch} />
    </div>
  )
}

// Chat bubble sequence
function ChatDemo() {
  const bubbles = [
    { role: 'child', text: 'Tell me a story!', delay: 0 },
    { role: 'buddy', text: 'Once upon a time, in a cloud kingdom…', delay: 0.6 },
    { role: 'child', text: 'What happens next?', delay: 1.2 },
    { role: 'buddy', text: 'A brave little dragon found a magical seed…', delay: 1.8 },
  ]
  return (
    <div className={styles.chatDemo}>
      {bubbles.map((b, i) => (
        <div
          key={i}
          className={`${styles.chatBubble} ${b.role === 'child' ? styles.chatChild : styles.chatBuddy}`}
          style={{ animationDelay: `${b.delay}s` }}
        >
          {b.role === 'buddy' && (
            <span className={styles.chatAvatar} aria-hidden="true">
              <svg viewBox="0 0 40 40" width="26" height="26">
                <circle cx="9" cy="9" r="7" fill="#7c3aed" />
                <circle cx="31" cy="9" r="7" fill="#7c3aed" />
                <circle cx="20" cy="24" r="16" fill="#7c3aed" />
                <circle cx="14" cy="21" r="4" fill="white" />
                <circle cx="26" cy="21" r="4" fill="white" />
                <circle cx="15" cy="20" r="2.2" fill="#1e1b4b" />
                <circle cx="27" cy="20" r="2.2" fill="#1e1b4b" />
                <path d="M 13 29 Q 20 34 27 29" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          )}
          <span className={styles.chatText}>{b.text}</span>
        </div>
      ))}
    </div>
  )
}

// Scroll reveal hook
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.unobserve(el) } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function RevealSection({ children, className = '' }) {
  const ref = useReveal()
  return <div ref={ref} className={`${styles.reveal} ${className}`}>{children}</div>
}

// Scrolling ticker
function Ticker() {
  const items = [
    '10 day free trial', 'No credit card needed', 'Cancel anytime',
    'Peace of mind camera', 'Parent voice messages', 'AI storytelling',
    'Kids courses', 'Safe & child-friendly', 'Made in South Africa 🇿🇦',
  ]
  const doubled = [...items, ...items]
  return (
    <div className={styles.tickerWrap} aria-hidden="true">
      <div className={styles.ticker}>
        {doubled.map((item, i) => (
          <span key={i} className={styles.tickerItem}>
            {item} <span className={styles.tickerDot}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [navHidden, setNavHidden] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const lastY = useRef(0)
  const pageRef = useRef(null)

  // Hide nav on scroll down, show on scroll up (rAF-throttled, one measurement per frame).
  // Also tracks whether we've scrolled past the hero, to show a sticky mobile
  // CTA bar — on a long single-page scroll, the only "Start Free Trial"
  // button shouldn't require scrolling all the way back to the top.
  // NOTE: the page scrolls inside .page (body is overflow:hidden), so the
  // listener must attach to that element — window.scrollY never changes here.
  useEffect(() => {
    const el = pageRef.current
    if (!el) return
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = el.scrollTop
        setNavHidden(y > 80 && y > lastY.current)
        setPastHero(y > window.innerHeight * 0.6)
        lastY.current = y
        ticking = false
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={styles.page} ref={pageRef}>
      {/* ── NAV ── */}
      <nav className={`${styles.nav} ${navHidden ? styles.navHidden : ''}`}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <svg viewBox="0 0 40 40" width="36" height="36">
              <circle cx="9" cy="9" r="7" fill="#7c3aed" />
              <circle cx="31" cy="9" r="7" fill="#7c3aed" />
              <circle cx="20" cy="24" r="16" fill="#7c3aed" />
              <circle cx="14" cy="21" r="4" fill="white" />
              <circle cx="26" cy="21" r="4" fill="white" />
              <circle cx="15" cy="20" r="2.2" fill="#1e1b4b" />
              <circle cx="27" cy="20" r="2.2" fill="#1e1b4b" />
              <path d="M 13 29 Q 20 34 27 29" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
            <span className={styles.logoText}>Buddy</span>
          </div>
          <div className={styles.navActions}>
            <button className={styles.navLogin} onClick={() => navigate('/login')}>Log In</button>
            <button className={styles.navCta} onClick={() => navigate('/login')}>Start Free Trial</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <Particles />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}><IconSparkle size={15} /> 10 days free, no card needed</div>
          <h1 className={styles.heroTitle}>
            Meet <span className={styles.gradientText}>Buddy</span>
            <br />your child's AI best friend
          </h1>
          <p className={styles.heroSub}>
            An always-on companion that tells stories, teaches courses, sings songs,
            and gives parents peace of mind, all in one magical app.
          </p>
          <div className={styles.heroCtas}>
            <button
              className={styles.ctaPrimary}
              onClick={() => navigate('/login')}
            >
              <span className={styles.ctaRipple} />
              Start Free Trial
            </button>
            <button className={styles.ctaGhost} onClick={() => navigate('/login')}>
              Log In
            </button>
          </div>
          <BuddyHero />
        </div>
      </section>

      {/* ── TICKER ── */}
      <Ticker />

      {/* ── FEATURES ── */}
      <section className={styles.features}>

        {/* Feature 1: Camera */}
        <RevealSection className={styles.featureRow}>
          <div className={styles.featureVisual}>
            <PhoneMockup />
          </div>
          <div className={styles.featureText}>
            <div className={styles.featureTag}>Peace of Mind</div>
            <h2 className={styles.featureTitle}>See your child, anytime</h2>
            <p className={styles.featureDesc}>
              Open the parent dashboard and stream a live view of your child's screen
              in real time. Whether you're at work or in another room, you're always
              just a tap away.
            </p>
            <div className={styles.featureChips}>
              <span><IconCamera size={14} /> Live camera</span>
              <span><IconLock size={14} /> Signed-in parents only</span>
              <span><IconBolt size={14} /> Real-time</span>
            </div>
          </div>
        </RevealSection>

        {/* Feature 2: Voice messages */}
        <RevealSection className={`${styles.featureRow} ${styles.featureRowReverse}`}>
          <div className={styles.featureText}>
            <div className={styles.featureTag}>Stay Connected</div>
            <h2 className={styles.featureTitle}>Leave voice messages for your child</h2>
            <p className={styles.featureDesc}>
              Record a voice note from the parent dashboard. Buddy delivers it instantly,
              even if you're not home. Your child hears your voice whenever they need it most.
            </p>
            <div className={styles.featureChips}>
              <span><IconMic size={14} /> Voice notes</span>
              <span><IconMail size={14} /> Instant delivery</span>
              <span><IconHeart size={14} /> Buddy plays it back</span>
            </div>
          </div>
          <div className={styles.featureVisual}>
            <div className={styles.voiceCard}>
              <div className={styles.voiceAvatar}><IconHeart size={22} filled /></div>
              <div className={styles.voiceInfo}>
                <span className={styles.voiceName}>Message from Mum</span>
                <Waveform />
              </div>
              <div className={styles.playBtn}><IconPlay size={16} /></div>
            </div>
          </div>
        </RevealSection>

        {/* Feature 3: AI Chat - full-width showcase, breaks the left/right split rhythm */}
        <RevealSection className={styles.featureShowcase}>
          <div className={styles.featureTag}>AI Companion</div>
          <h2 className={styles.featureTitle}>Buddy talks, plays and imagines with your child</h2>
          <p className={styles.featureDesc}>
            From bedtime stories to quiz games, jokes to feelings check-ins, Buddy adapts
            to whatever your child needs. Fully child-safe, always kind.
          </p>
          <div className={styles.showcaseChat}>
            <ChatDemo />
          </div>
          <div className={styles.featureChips}>
            <span><IconBook size={14} /> Stories</span>
            <span><IconSparkle size={14} /> Games</span>
            <span><IconMusic size={14} /> Sing-along</span>
            <span><IconShield size={14} /> Quiz</span>
          </div>
        </RevealSection>

        {/* Feature 4: Courses */}
        <RevealSection className={`${styles.featureRow} ${styles.featureRowReverse}`}>
          <div className={styles.featureText}>
            <div className={styles.featureTag}>Learn Something New</div>
            <h2 className={styles.featureTitle}>Interactive courses your child will love</h2>
            <p className={styles.featureDesc}>
              Buddy guides kids through real lessons in gardening, robotics, science,
              cooking, animals, and space, all delivered conversationally, at their pace,
              with no screens or worksheets required.
            </p>
            <div className={styles.featureChips}>
              <span>Gardening</span>
              <span>Robotics</span>
              <span>Science</span>
              <span>More coming</span>
            </div>
          </div>
          <div className={styles.featureVisual}>
            {/* Mirrors the real CoursesPage card shape (colored header + white
                body) so this preview matches what the product actually looks like. */}
            <div className={styles.courseCards}>
              {[
                { id: 'gardening', title: 'Gardening for Kids', color: ['#3ddc97', '#16a34a'] },
                { id: 'robotics', title: 'Robotics Basics', color: ['#4dadf7', '#2563eb'] },
                { id: 'science', title: 'Science Experiments', color: ['#ff9a3c', '#ec4899'] },
              ].map((c, i) => (
                <div
                  key={i}
                  className={styles.courseCard}
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <div
                    className={styles.courseCardHeader}
                    style={{ background: `linear-gradient(135deg, ${c.color[0]}, ${c.color[1]})` }}
                  >
                    <img
                      className={styles.courseCardCover}
                      src={`/courses/${c.id}.webp`}
                      alt=""
                      loading="lazy"
                      width="960"
                      height="549"
                    />
                  </div>
                  <div className={styles.courseCardBody}>
                    <span className={styles.courseTitle}>{c.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

      </section>

      {/* ── PRICING ── */}
      <section className={styles.pricing}>
        <RevealSection>
          <div className={styles.pricingLabel}>Simple Pricing</div>
          <h2 className={styles.pricingTitle}>Start free. Upgrade when you're ready.</h2>
        </RevealSection>

        <RevealSection className={styles.pricingCards}>
          {/* Free */}
          <div className={styles.pricingCard}>
            <div className={styles.planName}>Free</div>
            <div className={styles.planPrice}>
              <span className={styles.planAmount}>R0</span>
            </div>
            <p className={styles.planDesc}>Great for getting started</p>
            <ul className={styles.planFeatures}>
              <li className={styles.yes}><IconCheck size={14} /> Chat with Buddy (10/day)</li>
              <li className={styles.yes}><IconCheck size={14} /> Sing-along mode</li>
              <li className={styles.no}><IconX size={14} /> Live camera</li>
              <li className={styles.no}><IconX size={14} /> Parent voice messages</li>
              <li className={styles.no}><IconX size={14} /> Courses &amp; lessons</li>
              <li className={styles.no}><IconX size={14} /> Progress tracking</li>
            </ul>
            <button className={styles.planBtn} onClick={() => navigate('/login')}>
              Continue Free
            </button>
          </div>

          {/* Pro */}
          <div className={`${styles.pricingCard} ${styles.pricingCardPro}`}>
            <div className={styles.auroraRing} />
            <div className={styles.popularBadge}>Most Popular</div>
            <div className={styles.planName}>Pro</div>
            <div className={styles.planPrice}>
              <span className={styles.planAmount}>R149</span>
              <span className={styles.planPer}>/month</span>
            </div>
            <p className={styles.planDesc}>
              <strong className={styles.trialHighlight}>First 10 days free — no card needed.</strong>{' '}
              We&rsquo;ll ask for payment details on day 10. Then R149/month, cancel anytime.
            </p>
            <ul className={styles.planFeatures}>
              <li className={styles.yes}><IconCheck size={14} /> Unlimited daily messages</li>
              <li className={styles.yes}><IconCheck size={14} /> All 10 courses — literacy, numeracy, science &amp; more</li>
              <li className={styles.yes}><IconCheck size={14} /> Progress &amp; mastery tracking</li>
              <li className={styles.yes}><IconCheck size={14} /> Peace of mind camera</li>
              <li className={styles.yes}><IconCheck size={14} /> Parent voice messages</li>
              <li className={styles.yes}><IconCheck size={14} /> Avatar &amp; costume customisation</li>
              <li className={styles.yes}><IconCheck size={14} /> Priority support</li>
            </ul>
            <button
              className={`${styles.planBtn} ${styles.planBtnPro}`}
              onClick={() => navigate('/login')}
            >
              Start Free Trial
            </button>
          </div>
        </RevealSection>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <svg viewBox="0 0 40 40" width="28" height="28">
            <circle cx="9" cy="9" r="7" fill="#7c3aed" />
            <circle cx="31" cy="9" r="7" fill="#7c3aed" />
            <circle cx="20" cy="24" r="16" fill="#7c3aed" />
            <circle cx="14" cy="21" r="4" fill="white" />
            <circle cx="26" cy="21" r="4" fill="white" />
          </svg>
          <span>Buddy</span>
        </div>
        <p className={styles.footerTagline}>Made with ❤️ in South Africa</p>
        <p className={styles.footerLinks}>
          <button onClick={() => navigate('/login')}>Start Free Trial</button>
          <span>·</span>
          <button onClick={() => navigate('/login')}>Log In</button>
        </p>
        <p className={styles.footerCopy}>© {new Date().getFullYear()} Buddy. All rights reserved.</p>
      </footer>

      {/* Mobile-only sticky CTA — on a long phone-scroll, the signup button
          shouldn't require scrolling back to the top. */}
      <div className={`${styles.stickyCta} ${pastHero ? styles.stickyCtaVisible : ''}`}>
        <button className={styles.stickyCtaBtn} onClick={() => navigate('/login')}>
          Start Free Trial
        </button>
      </div>
    </div>
  )
}
