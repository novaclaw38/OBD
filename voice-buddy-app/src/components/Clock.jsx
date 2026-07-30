import { useState, useEffect, useMemo } from 'react'
import styles from './Clock.module.css'

// The hands are driven by CSS animations (see Clock.module.css) so they sweep
// continuously and smoothly, instead of re-rendering on every tick. We just
// compute a negative animation-delay once on mount so each hand starts already
// at the correct position for the current wall-clock time.
function useHandDelays() {
  return useMemo(() => {
    const d = new Date()
    const s = d.getSeconds()
    const m = d.getMinutes()
    const h = d.getHours() % 12
    return {
      second: -s,
      minute: -(m * 60 + s),
      hour: -(h * 3600 + m * 60 + s),
    }
  }, [])
}

// A little wind-up desk alarm clock — twin glassy bells, a swinging clapper
// between them, and stubby feet — rendered with the same glossy-candy
// gradients and soft glow as WorldBackdrop's sun/moon, so it reads as part
// of the same illustrated world instead of a flat line-art readout. Time is
// still announced via aria-label for screen readers.
export default function Clock({ className, partOfDay }) {
  const [now, setNow] = useState(() => new Date())
  const delays = useHandDelays()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const night = partOfDay === 'night'

  return (
    <span className={`${styles.clock} ${className || ''}`} aria-label={`Current time ${time}`}>
      <svg className={styles.face} viewBox="0 0 40 46" aria-hidden="true">
        <defs>
          <radialGradient id="clockBell" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#f4ecff" />
            <stop offset="55%" stopColor="#d9c8fb" />
            <stop offset="100%" stopColor="var(--c-grape)" />
          </radialGradient>
          <radialGradient id="clockFace" cx="38%" cy="32%" r="80%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#fbf8ff" />
            <stop offset="100%" stopColor="#e7ddfb" />
          </radialGradient>
          <linearGradient id="clockFoot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-grape)" />
            <stop offset="100%" stopColor="var(--c-grape-d)" />
          </linearGradient>
          <filter id="clockShadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#5b21b6" floodOpacity="0.35" />
          </filter>
        </defs>

        <g filter="url(#clockShadow)">
          {/* Bells — the rim (drawn after) covers each bell's lower half, so
              only the dome peeks out above the face. */}
          <circle className={styles.bell} cx="9"  cy="14" r="7" />
          <circle className={styles.bell} cx="31" cy="14" r="7" />
          <circle className={styles.bellShine} cx="6.5" cy="11" r="1.9" />
          <circle className={styles.bellShine} cx="28.5" cy="11" r="1.9" />

          <circle className={styles.rim} cx="20" cy="27" r="15" />
          <circle className={styles.faceInner} cx="20" cy="27" r="12.4" />
          <ellipse className={styles.gloss} cx="15.5" cy="20.5" rx="7.5" ry="5.5" />
        </g>

        {[0, 90, 180, 270].map((deg) => (
          <circle
            key={deg}
            className={deg === 0 ? (night ? styles.tickMoon : styles.tickSun) : styles.tick}
            cx="20" cy="14.5" r={deg === 0 ? 1.6 : 1.1}
            transform={`rotate(${deg} 20 27)`}
          />
        ))}
        <line
          className={styles.hourHand}
          x1="20" y1="27" x2="20" y2="19.5"
          style={{ animationDelay: `${delays.hour}s` }}
        />
        <line
          className={styles.minuteHand}
          x1="20" y1="27" x2="20" y2="16"
          style={{ animationDelay: `${delays.minute}s` }}
        />
        <line
          className={styles.secondHand}
          x1="20" y1="27" x2="20" y2="15"
          style={{ animationDelay: `${delays.second}s` }}
        />
        <circle className={styles.pin} cx="20" cy="27" r="1.7" />

        {/* Clapper — sits in front of the face, swinging between the bells. */}
        <g className={styles.clapper}>
          <line className={styles.clapperArm} x1="20" y1="8" x2="20" y2="14" />
          <circle className={styles.clapperBall} cx="20" cy="14" r="1.6" />
        </g>

        <rect className={styles.foot} x="9"  y="41" width="5" height="3" rx="1.4" />
        <rect className={styles.foot} x="26" y="41" width="5" height="3" rx="1.4" />
      </svg>
    </span>
  )
}
