import { useState, useEffect, useRef } from 'react'
import VoiceButton from '../VoiceButton.jsx'
import { chatCompletion } from '../../services/chatService.js'
import styles from './OpenResponseCard.module.css'

// `open-response` replaces `activity`: the child's spoken answer is
// actually evaluated (not just recorded) against step.rubric, using the
// existing Buddy chat model. Falls back to warm, unconditional
// acknowledgment if the API call fails for any reason — a lesson's
// progress should never be blocked by network flakiness, matching the
// TTS fallback pattern in useSpeech.js. See
// docs/superpowers/specs/2026-07-30-learn-section-redesign-design.md §2-3.
export default function OpenResponseCard({ step, settings, speech, onComplete }) {
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState('')
  const [listening, setListening] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const timerRef = useRef(null)
  const buddyName = settings.buddyName || 'Buddy'

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const evaluate = async (text) => {
    setEvaluating(true)
    try {
      const reply = await chatCompletion([
        {
          role: 'system',
          content: `You are ${buddyName}, a warm children's tutor speaking to a ${settings.childAge || 7}-year-old. ` +
            `The lesson objective is: "${step.objective}". Rubric for judging the child's answer: "${step.rubric}". ` +
            `The child said: "${text}". Reply with exactly one short, encouraging spoken sentence of feedback ` +
            `(no more than 20 words), then on a new line write either MET or NOT_MET.`,
        },
      ], { mode: 'learn', maxTokens: 80, temperature: 0.6 })
      const lines = reply.split('\n').map(l => l.trim()).filter(Boolean)
      const spoken = lines[0] || `Nice try! Let's keep going.`
      const met = /MET/.test(lines[lines.length - 1] || '') && !/NOT_MET/.test(lines[lines.length - 1] || '')
      setFeedback(spoken)
      speech?.speak(spoken, () => {
        timerRef.current = setTimeout(() => onComplete(met ? 100 : 70), 400)
      })
    } catch {
      const spoken = `Thanks for sharing that with me!`
      setFeedback(spoken)
      speech?.speak(spoken, () => {
        timerRef.current = setTimeout(() => onComplete(100), 400)
      })
    } finally {
      setEvaluating(false)
    }
  }

  const handlePress = () => {
    if (listening) {
      speech.stopListening()
      setListening(false)
      return
    }
    setListening(true)
    speech.startListening((text) => {
      setTranscript(text)
      setListening(false)
      evaluate(text)
    })
  }

  const status = listening ? 'listening' : evaluating ? 'thinking' : 'idle'

  return (
    <div className={styles.card}>
      {!transcript && (
        <p className={styles.hint}>Tap the mic and speak your answer!</p>
      )}
      <VoiceButton status={status} onPress={handlePress} buddyName={buddyName} />
      {transcript && (
        <p className={styles.transcript}>"{transcript}"</p>
      )}
      {feedback && (
        <p className={styles.feedback}>{feedback}</p>
      )}
    </div>
  )
}
