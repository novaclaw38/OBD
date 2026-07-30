import styles from './TeachCard.module.css'

// `teach` replaces `explain`: same instructional fact, plus an optional
// spoken check-question/answer beat (narrated by LessonPage, not gated —
// see docs/superpowers/specs/2026-07-30-learn-section-redesign-design.md §2).
export default function TeachCard({ step }) {
  return (
    <div className={styles.card}>
      <span className={styles.emoji}>{step.emoji}</span>
      <p className={styles.fact}>{step.fact}</p>
      {step.checkQuestion && (
        <div className={styles.check}>
          <p className={styles.checkQuestion}>{step.checkQuestion}</p>
          <p className={styles.checkAnswer}>{step.checkAnswer}</p>
        </div>
      )}
    </div>
  )
}
