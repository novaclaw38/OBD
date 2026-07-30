import { useState, useEffect, useRef } from 'react'
import styles from './StoryBuildCard.module.css'

// `story-build`: a short authored branching scenario for lessons where
// the "practice" is a judgment call rather than a fact (mainly SEL).
// Every choice gets a validating spoken response — there's no "wrong"
// answer shown to the child; `isIdeal` only feeds the internal mastery
// score. See docs/superpowers/specs/2026-07-30-learn-section-redesign-design.md §3.
export default function StoryBuildCard({ step, speech, onComplete }) {
  const [beatIndex, setBeatIndex] = useState(0)
  const [chosen, setChosen] = useState(null)
  const idealHitsRef = useRef(0)
  const timerRef = useRef(null)

  const beats = step.beats
  const beat = beats[beatIndex]

  useEffect(() => {
    speech?.speak(beat.prompt)
    return () => clearTimeout(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatIndex])

  const handleChoice = (choice) => {
    if (chosen !== null) return
    setChosen(choice)
    if (choice.isIdeal) idealHitsRef.current += 1
    speech?.speak(choice.response, () => {
      timerRef.current = setTimeout(() => {
        if (beatIndex < beats.length - 1) {
          setBeatIndex(i => i + 1)
          setChosen(null)
        } else {
          const score = Math.round((idealHitsRef.current / beats.length) * 100)
          onComplete(Math.max(score, 60)) // SEL reflection is never scored harshly
        }
      }, 300)
    })
  }

  return (
    <div className={styles.card}>
      <p className={styles.prompt}>{beat.prompt}</p>
      <div className={styles.choices}>
        {beat.choices.map((choice, i) => (
          <button
            key={i}
            className={`${styles.choice} ${chosen === choice ? styles.choiceSelected : ''}`}
            disabled={chosen !== null}
            onClick={() => handleChoice(choice)}
          >
            {choice.text}
          </button>
        ))}
      </div>
      {chosen && (
        <p className={styles.response}>{chosen.response}</p>
      )}
    </div>
  )
}
