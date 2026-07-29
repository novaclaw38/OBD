import { useId } from 'react'
import styles from './BuddyAvatar.module.css'
import { useMouthLevel } from '../hooks/useMouthLevel.js'
import { useBuddyLife } from '../hooks/useBuddyLife.js'
import { Costume } from './BuddyCostumes.jsx'
import { CostumeOverlay } from './BuddyCostumeOverlays.jsx'

const STATE_COLORS = {
  idle:      { face: '#7c3aed', glow: '#a855f7' },
  listening: { face: '#16a34a', glow: '#4ade80' },
  speaking:  { face: '#d97706', glow: '#fcd34d' },
  thinking:  { face: '#2563eb', glow: '#60a5fa' },
  happy:     { face: '#ec4899', glow: '#f9a8d4' },
  confused:  { face: '#64748b', glow: '#94a3b8' },
}

// Pear-ish blob: wider at the bottom so it reads as having weight.
const BLOB_PATH =
  'M50 18 C76 18 90 37 90 60 C90 85 73 97 50 97 C27 97 10 85 10 60 C10 37 24 18 50 18 Z'

export default function BuddyAvatar({
  status = 'idle',
  avatarColor,
  type = 'bear',
  costume = null,
  size = 170,
  audioRef,
  live = true,
  partOfDay,
}) {
  const colors    = STATE_COLORS[status] || STATE_COLORS.idle
  const bodyColor = avatarColor && status === 'idle' ? avatarColor : colors.face
  const isListening = status === 'listening'
  const isSpeaking  = status === 'speaking'
  const isThinking  = status === 'thinking'
  const isHappy     = status === 'happy'
  const isConfused  = status === 'confused'

  const getMouthLevel = useMouthLevel(audioRef, isSpeaking && live)
  const { containerRef, poke } = useBuddyLife({ status, live, getMouthLevel })

  const eyeR = isListening ? 10 : 9
  const gradId = useId()

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${styles[status]} ${live ? '' : styles.static} ${partOfDay === 'night' ? styles.nightRing : ''}`}
      style={{ width: size + 20, height: size + 20 }}
      onPointerDown={live ? poke : undefined}
    >
      <div className={styles.glow} style={{ background: colors.glow, width: size, height: size }} />

      <svg
        viewBox="0 0 100 100"
        className={styles.face}
        style={{ width: size, height: size, ['--body']: bodyColor }}
        aria-label={`Buddy is ${status}`}
      >
        <defs>
          {/* Light-to-dark radial gradient derived from --body via color-mix,
              so any avatar color automatically reads as a rounded, lit surface
              instead of a flat fill. */}
          <radialGradient id={`bodyGrad-${gradId}`} cx="38%" cy="30%" r="80%">
            <stop offset="0%" className={styles.gradLight} />
            <stop offset="100%" className={styles.gradDark} />
          </radialGradient>
        </defs>

        {/* Ground contact shadow — sits outside bodyGroup so it doesn't
            deform with the squash/stretch, only shrinks as Buddy bounces up. */}
        <ellipse className={styles.groundShadow} cx="50" cy="98" rx="27" ry="7" />

        {/* Body group — squash/stretch + bounce applied here so the whole
            character deforms like jelly. */}
        <g className={styles.bodyGroup}>
          {/* Costume behind the body (ears, spikes) — filled in Task 4 */}
          <Costume type={type} isListening={isListening} s={styles} />

          {/* Blob body */}
          <path d={BLOB_PATH} className={styles.body} fill={`url(#bodyGrad-${gradId})`} />
          {/* Bottom depth shadow */}
          <ellipse cx="50" cy="86" rx="30" ry="10" fill="rgba(0,0,0,0.10)" />
          {/* Glossy top highlight */}
          <ellipse cx="42" cy="40" rx="22" ry="14" fill="rgba(255,255,255,0.18)" />
          {/* Belly highlight */}
          <ellipse cx="50" cy="66" rx="20" ry="14" fill="rgba(255,255,255,0.10)" />

          {/* Cheek blush */}
          <circle cx="26" cy="64" r="8" fill="rgba(255,120,120,0.28)" />
          <circle cx="74" cy="64" r="8" fill="rgba(255,120,120,0.28)" />

          {/* Eyes: happy squints into arcs; everyone else gets round pupil eyes
              (blink squashes each eye group vertically). */}
          {isHappy ? (
            <>
              <path d="M 27 54 Q 35 44 43 54" className={styles.happyEye} />
              <path d="M 57 54 Q 65 44 73 54" className={styles.happyEye} />
            </>
          ) : (
            <>
              <g className={styles.eye} style={{ ['--ex']: '35px' }}>
                <circle cx="35" cy="52" r={eyeR} fill="white" />
                <g className={styles.pupil}>
                  <circle cx="35" cy="52" r="5" fill="#1e1b4b" />
                  <circle cx="36.6" cy="50" r="1.8" fill="white" />
                  <circle cx="33.6" cy="53.5" r="1" fill="rgba(255,255,255,0.7)" />
                </g>
              </g>
              <g className={styles.eye} style={{ ['--ex']: '65px' }}>
                <circle cx="65" cy="52" r={eyeR} fill="white" />
                <g className={styles.pupil}>
                  <circle cx="65" cy="52" r="5" fill="#1e1b4b" />
                  <circle cx="66.6" cy="50" r="1.8" fill="white" />
                  <circle cx="63.6" cy="53.5" r="1" fill="rgba(255,255,255,0.7)" />
                </g>
              </g>
            </>
          )}

          {/* Brows: raised when listening, quizzically asymmetric when confused */}
          {isListening && (
            <>
              <path d="M 27 41 Q 35 36 43 41" className={styles.brow} />
              <path d="M 57 41 Q 65 36 73 41" className={styles.brow} />
            </>
          )}
          {isConfused && (
            <>
              <path d="M 27 39 Q 35 43 43 40" className={styles.brow} />
              <path d="M 57 36 Q 65 32 73 37" className={styles.brow} />
            </>
          )}

          {/* Mouth: resting smile, or a state-driven shape */}
          {isSpeaking ? (
            <g className={styles.mouthGroup}>
              <ellipse cx="50" cy="74" rx="8" ry="6" fill="rgba(60,20,20,0.55)" />
            </g>
          ) : isThinking ? (
            <path d="M 42 75 Q 50 75 58 75" className={styles.mouthLine} />
          ) : isHappy ? (
            <path d="M 38 72 Q 50 88 62 72 Q 50 80 38 72 Z" className={styles.grin} />
          ) : isConfused ? (
            <path d="M 41 77 Q 50 73 59 77" className={styles.mouthLine} />
          ) : (
            <path d="M 40 73 Q 50 82 60 73" className={styles.smile} />
          )}

          {/* Speaking / happy sparkles */}
          {(isSpeaking || isHappy) && (
            <g>
              <polygon className={styles.spark1} points="8,20 9.5,24 13,24 10.5,26.5 11.5,30 8,28 4.5,30 5.5,26.5 3,24 6.5,24" fill="#fcd34d" />
              <polygon className={styles.spark2} points="92,17 93,20 96,20 94,22 94.5,25 92,23.5 89.5,25 90,22 88,20 91,20" fill="#fcd34d" />
              <circle className={styles.spark3} cx="18" cy="12" r="2.5" fill="#f9a8d4" />
              <circle className={styles.spark4} cx="82" cy="10" r="2" fill="#86efac" />
            </g>
          )}

          {/* Thinking dots */}
          {isThinking && (
            <g>
              <circle className={styles.thinkDot1} cx="38" cy="90" r="3.2" fill="rgba(255,255,255,0.75)" />
              <circle className={styles.thinkDot2} cx="50" cy="90" r="3.2" fill="rgba(255,255,255,0.75)" />
              <circle className={styles.thinkDot3} cx="62" cy="90" r="3.2" fill="rgba(255,255,255,0.75)" />
            </g>
          )}

          {/* Premium costume (Pro) — drawn last so it sits on top of everything */}
          <CostumeOverlay costumeId={costume} />
        </g>
      </svg>
    </div>
  )
}
