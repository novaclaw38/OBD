import { useState, useEffect, useRef } from 'react'
import styles from './PracticeCard.module.css'

// `practice` replaces `quiz`: a wrong pick speaks a hint specific to that
// misconception (step.hints[wrongIndex]) before letting the child retry,
// instead of silently resetting. Reports a 0-100 first-try score via
// onComplete for the lesson's mastery tally.
export default function PracticeCard({ step, speech, onComplete }) {
  const [selected, setSelected] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const attemptsRef = useRef(0)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleSelect = (i) => {
    if (selected !== null) return
    setSelected(i)
    if (i === step.correct) {
      setShowConfetti(true)
      // First-try correct = 100, each extra attempt costs 25 (floors at 25).
      const score = Math.max(25, 100 - attemptsRef.current * 25)
      timerRef.current = setTimeout(() => onComplete(score), 650)
    } else {
      attemptsRef.current += 1
      const hint = step.hints?.[i]
      if (hint) speech?.speak(hint)
      timerRef.current = setTimeout(() => setSelected(null), hint ? 2200 : 900)
    }
  }

  const getOptionClass = (i) => {
    if (selected === null) return styles.option
    if (i === step.correct) return `${styles.option} ${selected === i ? styles.correct : styles.correctReveal}`
    if (i === selected) return `${styles.option} ${styles.wrong}`
    return styles.option
  }

  return (
    <div className={styles.card}>
      <p className={styles.question}>{step.question}</p>
      <div className={`${styles.options} ${styles.confettiWrap}`}>
        {showConfetti && (
          <div className={styles.confetti} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => <span key={i} />)}
          </div>
        )}
        {step.options.map((opt, i) => {
          const spaceIdx = opt.indexOf(' ')
          const emoji = spaceIdx > -1 ? opt.slice(0, spaceIdx) : ''
          const text  = spaceIdx > -1 ? opt.slice(spaceIdx + 1) : opt
          return (
            <button
              key={i}
              className={getOptionClass(i)}
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
            >
              {emoji && <span className={styles.optEmoji}>{emoji}</span>}
              <span className={styles.optText}>{text}</span>
            </button>
          )
        })}
      </div>
      {selected !== null && selected !== step.correct && step.hints?.[selected] && (
        <p className={styles.hintText}>{step.hints[selected]}</p>
      )}
    </div>
  )
}
