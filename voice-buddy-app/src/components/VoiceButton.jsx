import styles from './VoiceButton.module.css'

export default function VoiceButton({ status, onPress, onRelease, tapMode = true, buddyName = 'Buddy' }) {
  const isListening = status === 'listening'
  const isSpeaking = status === 'speaking'
  const isThinking = status === 'thinking'
  const disabled = isSpeaking || isThinking

  const handlePress = () => {
    if (disabled) return
    onPress?.()
  }

  const handleRelease = () => {
    if (tapMode || !isListening) return
    onRelease?.()
  }

  return (
    <div className={styles.wrapper}>
      <button
        className={`${styles.button} ${styles[status]}`}
        onPointerDown={handlePress}
        onPointerUp={handleRelease}
        disabled={disabled}
        aria-label={isListening ? 'Tap to stop listening' : `Tap to talk to ${buddyName}`}
      >
        {isListening ? (
          /* Mic active (waveform) */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="white" stroke="white" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        ) : isSpeaking ? (
          /* Speaker wave */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="white" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        ) : isThinking ? (
          /* Spinner */
          <div className="spinner" />
        ) : (
          /* Idle mic */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>

      <p className={styles.label}>
        {isListening ? 'Listening…' : isSpeaking ? `${buddyName} is talking…` : isThinking ? 'Thinking…' : 'Tap to talk!'}
      </p>
    </div>
  )
}
