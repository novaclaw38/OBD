import { useState, useRef } from 'react'
import styles from './MasteryCheckCard.module.css'

// `mastery-check`: a short cumulative check spanning 2-3 of the lesson's
// concepts (same item shape as `practice`). Produces the score that
// drives the lesson's mastery tier — see
// docs/superpowers/specs/2026-07-30-learn-section-redesign-design.md §2, §4.
export default function MasteryCheckCard({ step, speech, onComplete }) {
  const [itemIndex, setItemIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const scoresRef = useRef([])
  const attemptsRef = useRef(0)

  const items = step.items
  const item = items[itemIndex]

  const handleSelect = (i) => {
    if (selected !== null) return
    setSelected(i)
    if (i === item.correct) {
      const score = Math.max(25, 100 - attemptsRef.current * 25)
      scoresRef.current.push(score)
      setTimeout(() => {
        if (itemIndex < items.length - 1) {
          setItemIndex(idx => idx + 1)
          setSelected(null)
          attemptsRef.current = 0
        } else {
          const avg = Math.round(scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length)
          onComplete(avg)
        }
      }, 650)
    } else {
      attemptsRef.current += 1
      const hint = item.hints?.[i]
      if (hint) speech?.speak(hint)
      setTimeout(() => setSelected(null), hint ? 2000 : 800)
    }
  }

  const getOptionClass = (i) => {
    if (selected === null) return styles.option
    if (i === item.correct) return `${styles.option} ${selected === i ? styles.correct : styles.correctReveal}`
    if (i === selected) return `${styles.option} ${styles.wrong}`
    return styles.option
  }

  return (
    <div className={styles.card}>
      <p className={styles.progress}>Question {itemIndex + 1} of {items.length}</p>
      <p className={styles.question}>{item.question}</p>
      <div className={styles.options}>
        {item.options.map((opt, i) => {
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
    </div>
  )
}
