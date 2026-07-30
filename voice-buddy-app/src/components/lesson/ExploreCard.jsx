import { useState, useMemo, useEffect, useRef } from 'react'
import styles from './ExploreCard.module.css'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function splitEmoji(s) {
  const i = s.indexOf(' ')
  return { emoji: i > -1 ? s.slice(0, i) : '', text: i > -1 ? s.slice(i + 1) : s }
}

// `explore` replaces `label`: tap-based hands-on practice generalized to
// three mechanics (no drag, per mobile-first guidance) —
//   mode 'sequence' (default): tap items in the correct order
//   mode 'sort':     tap an item, then tap the bucket it belongs in
//   mode 'match':    tap a left item, then its matching right item
// See docs/superpowers/specs/2026-07-30-learn-section-redesign-design.md §2.
export default function ExploreCard({ step, onComplete }) {
  const mode = step.mode || 'sequence'
  const timerRef = useRef(null)
  useEffect(() => () => clearTimeout(timerRef.current), [])

  if (mode === 'sort') return <SortExplore step={step} onComplete={onComplete} timerRef={timerRef} />
  if (mode === 'match') return <MatchExplore step={step} onComplete={onComplete} timerRef={timerRef} />
  return <SequenceExplore step={step} onComplete={onComplete} timerRef={timerRef} />
}

function SequenceExplore({ step, onComplete, timerRef }) {
  const [placed, setPlaced] = useState([])
  const shuffledItems = useMemo(() => shuffleArray(step.items), [step.items])

  const handleTap = (item) => {
    const next = [...placed, item]
    setPlaced(next)
    if (next.length === step.items.length) {
      timerRef.current = setTimeout(() => onComplete(100), 500)
    }
  }

  const remaining = shuffledItems.filter(item => !placed.includes(item))

  return (
    <div className={styles.card}>
      <div className={styles.placed}>
        {step.items.map((item, i) => {
          const { emoji } = splitEmoji(item)
          const isFilled = placed.includes(item)
          return (
            <span key={item} className={`${styles.labelSlot} ${isFilled ? styles.labelFilled : styles.labelEmpty}`}>
              {isFilled ? emoji : `${i + 1}`}
            </span>
          )
        })}
      </div>
      <span className={styles.visual}>{step.visual}</span>
      <p className={styles.instruction}>Tap the labels in order ↓</p>
      <div className={styles.chips}>
        {remaining.map(item => {
          const { emoji, text } = splitEmoji(item)
          return (
            <button key={item} className={styles.chip} onClick={() => handleTap(item)}>
              {emoji && <span className={styles.chipEmoji}>{emoji}</span>}
              <span className={styles.chipText}>{text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SortExplore({ step, onComplete, timerRef }) {
  const [placedByBucket, setPlacedByBucket] = useState([[], []])
  const [selected, setSelected] = useState(null)
  const [shake, setShake] = useState(false)
  const shuffledItems = useMemo(() => shuffleArray(step.items), [step.items])
  const placedFlat = placedByBucket.flat()
  const remaining = shuffledItems.filter(it => !placedFlat.includes(it.text))

  const handleBucket = (bucketIdx) => {
    if (!selected) return
    if (selected.bucket === bucketIdx) {
      const next = placedByBucket.map((b, i) => i === bucketIdx ? [...b, selected.text] : b)
      setPlacedByBucket(next)
      setSelected(null)
      if (next.flat().length === step.items.length) {
        timerRef.current = setTimeout(() => onComplete(100), 500)
      }
    } else {
      setShake(true)
      setTimeout(() => { setShake(false); setSelected(null) }, 500)
    }
  }

  return (
    <div className={styles.card}>
      <p className={styles.instruction}>{step.instruction || 'Tap an item, then tap where it belongs ↓'}</p>
      <div className={styles.buckets}>
        {step.buckets.map((label, i) => (
          <button
            key={label}
            className={`${styles.bucket} ${selected ? styles.bucketActive : ''} ${shake && selected?.bucket !== i ? '' : ''}`}
            onClick={() => handleBucket(i)}
          >
            <span className={styles.bucketLabel}>{label}</span>
            <span className={styles.bucketItems}>
              {placedByBucket[i].map(t => splitEmoji(t).emoji).join(' ')}
            </span>
          </button>
        ))}
      </div>
      <div className={`${styles.chips} ${shake ? styles.shake : ''}`}>
        {remaining.map(it => {
          const { emoji, text } = splitEmoji(it.text)
          const isSelected = selected?.text === it.text
          return (
            <button
              key={it.text}
              className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
              onClick={() => setSelected(it)}
            >
              {emoji && <span className={styles.chipEmoji}>{emoji}</span>}
              <span className={styles.chipText}>{text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MatchExplore({ step, onComplete, timerRef }) {
  const [matched, setMatched] = useState([])
  const [pickLeft, setPickLeft] = useState(null)
  const [wrongPair, setWrongPair] = useState(null)
  const leftItems = useMemo(() => shuffleArray(step.items.map((p, i) => ({ ...p, i }))), [step.items])
  const rightItems = useMemo(() => shuffleArray(step.items.map((p, i) => ({ ...p, i }))), [step.items])

  const handleLeft = (item) => {
    if (matched.includes(item.i)) return
    setPickLeft(item)
  }

  const handleRight = (item) => {
    if (matched.includes(item.i) || !pickLeft) return
    if (item.i === pickLeft.i) {
      const next = [...matched, item.i]
      setMatched(next)
      setPickLeft(null)
      if (next.length === step.items.length) {
        timerRef.current = setTimeout(() => onComplete(100), 500)
      }
    } else {
      setWrongPair(item.i)
      setTimeout(() => { setWrongPair(null); setPickLeft(null) }, 500)
    }
  }

  return (
    <div className={styles.card}>
      <p className={styles.instruction}>{step.instruction || 'Tap a match on each side ↓'}</p>
      <div className={styles.matchCols}>
        <div className={styles.matchCol}>
          {leftItems.map(item => (
            <button
              key={`l-${item.i}`}
              className={`${styles.matchChip} ${matched.includes(item.i) ? styles.chipMatched : ''} ${pickLeft?.i === item.i ? styles.chipSelected : ''}`}
              disabled={matched.includes(item.i)}
              onClick={() => handleLeft(item)}
            >
              {item.left}
            </button>
          ))}
        </div>
        <div className={styles.matchCol}>
          {rightItems.map(item => (
            <button
              key={`r-${item.i}`}
              className={`${styles.matchChip} ${matched.includes(item.i) ? styles.chipMatched : ''} ${wrongPair === item.i ? styles.chipWrong : ''}`}
              disabled={matched.includes(item.i)}
              onClick={() => handleRight(item)}
            >
              {item.right}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
