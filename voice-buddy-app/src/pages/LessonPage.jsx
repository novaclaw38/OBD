import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { COURSES } from '../utils/courses.js'
import { pickNarration } from '../utils/pickNarration.js'
import { getSettings } from '../utils/storage.js'
import { useSpeech } from '../hooks/useSpeech.js'
import { useCompletions } from '../hooks/useCompletions.js'
import BuddyAvatar from '../components/BuddyAvatar.jsx'
import SpeechBubble from '../components/SpeechBubble.jsx'
import ExplainCard from '../components/lesson/ExplainCard.jsx'
import QuizCard from '../components/lesson/QuizCard.jsx'
import LabelCard from '../components/lesson/LabelCard.jsx'
import ActivityCard from '../components/lesson/ActivityCard.jsx'
import RewardScreen from '../components/lesson/RewardScreen.jsx'
import styles from './LessonPage.module.css'
import { IconArrowLeft, IconArrowRight, IconPrinter, IconStar, IconSparkle } from '../components/icons.jsx'

// Quiz options and label items are authored as "emoji Text" — strip the
// emoji off so it reads naturally aloud instead of literally saying "emoji".
function stripEmojiPrefix(s) {
  const i = s.indexOf(' ')
  return i > -1 ? s.slice(i + 1) : s
}

export default function LessonPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [settings] = useState(() => getSettings()) // Fix 3: read localStorage once on mount
  const speech = useSpeech(settings)
  const { markComplete } = useCompletions()

  const courseId = searchParams.get('course')
  const lessonId = searchParams.get('lesson')
  const course = COURSES.find(c => c.id === courseId)
  const lesson = course?.lessons.find(l => l.id === lessonId)

  const [stepIndex, setStepIndex] = useState(0)
  const [stepComplete, setStepComplete] = useState(false)
  const [phase, setPhase] = useState('steps') // 'steps' | 'reward'
  const [buddyText, setBuddyText] = useState('')
  const [uiStatus, setUiStatus] = useState('idle')
  const [printTarget, setPrintTarget] = useState(null)
  const stepKeyRef = useRef(0)

  const handlePrintSheet = () => {
    setPrintTarget('sheet')
    setTimeout(() => { window.print(); setPrintTarget(null) }, 80)
  }

  const childAge = settings.childAge || 7

  // Compute step-derived values with optional chaining so they're safe before the guard
  const steps = lesson?.steps
  const step = steps?.[stepIndex]
  const narration = step ? pickNarration(step, childAge) : ''

  // Fix 2: navigate is a side-effect — must not be called during render
  useEffect(() => {
    if (!lesson) navigate('/courses')
  }, [lesson, navigate])

  // Fix 1: hoisted above the if (!lesson) guard; guard inside the effect body
  useEffect(() => {
    if (!lesson) return
    stepKeyRef.current += 1
    setStepComplete(false)
    setBuddyText(narration)
    setUiStatus('speaking')
    speech.speak(narration, () => {
      // A pre-reader can't tell quiz options or label chips apart from text
      // alone, so read them aloud right after the question/prompt — the
      // emoji is a hint, the voice is the real answer key.
      if (step.type === 'quiz') {
        const optionsText = step.options.map((o, i) => `${String.fromCharCode(65 + i)}: ${stripEmojiPrefix(o)}.`).join(' ')
        setBuddyText(optionsText)
        setUiStatus('speaking')
        speech.speak(optionsText, () => setUiStatus('idle'))
        return
      }
      if (step.type === 'label') {
        const itemsText = `Find these: ${step.items.map(stripEmojiPrefix).join(', ')}.`
        setBuddyText(itemsText)
        setUiStatus('speaking')
        speech.speak(itemsText, () => setUiStatus('idle'))
        return
      }
      setUiStatus('idle')
      // explain cards auto-complete after narration
      if (step.type === 'explain') setStepComplete(true)
    })
    return () => speech.stopSpeaking()
  }, [stepIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!lesson) {
    return null
  }

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1)
    } else {
      speech.stopSpeaking()
      markComplete(courseId, lessonId)
      setPhase('reward')
    }
  }

  const handleBack = () => {
    speech.stopSpeaking()
    if (stepIndex > 0) {
      setStepIndex(i => i - 1)
    } else {
      navigate('/courses')
    }
  }

  if (phase === 'reward') {
    return (
      <RewardScreen
        lesson={lesson}
        course={course}
        childName={settings.childName}
        avatarType={settings.avatarType}
        avatarColor={settings.avatarColor}
        costume={settings.costume}
        onBack={() => navigate('/courses')}
      />
    )
  }

  const stepKey = `${stepIndex}-${stepKeyRef.current}`

  return (
  <>
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.back} onClick={handleBack}><IconArrowLeft size={17} /> Back</button>
        <span className={styles.lessonTitle}>{lesson.emoji} {lesson.title}</span>
        <div className={styles.headerRight}>
          <div className={styles.dots}>
            {steps.map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`${styles.dot} ${i === stepIndex ? styles.dotActive : ''} ${i < stepIndex ? styles.dotDone : ''}`}
              ><IconStar size={13} /></span>
            ))}
          </div>
          <button className={styles.printBtn} onClick={handlePrintSheet} aria-label="Print worksheet" title="Print worksheet"><IconPrinter size={19} /></button>
        </div>
      </div>

      {/* Buddy avatar */}
      <div className={styles.avatarArea}>
        <BuddyAvatar
          status={uiStatus}
          avatarColor={settings.avatarColor}
          type={settings.avatarType || 'bear'}
          costume={settings.costume}
          audioRef={speech.audioRef}
        />
      </div>

      {/* Narration bubble */}
      <div className={styles.bubbleArea}>
        <SpeechBubble
          buddyText={buddyText}
          userText=""
          status={uiStatus}
          storyMode={false}
          wordIndex={-1}
        />
      </div>

      {/* Step card */}
      <div className={styles.cardArea}>
        {step.type === 'explain' && (
          <ExplainCard key={stepKey} step={step} />
        )}
        {step.type === 'quiz' && (
          <QuizCard key={stepKey} step={step} onComplete={() => setStepComplete(true)} />
        )}
        {step.type === 'label' && (
          <LabelCard key={stepKey} step={step} onComplete={() => setStepComplete(true)} />
        )}
        {step.type === 'activity' && (
          <ActivityCard
            key={stepKey}
            step={step}
            settings={settings}
            speech={speech}
            onComplete={() => setStepComplete(true)}
          />
        )}
      </div>

      {/* Next button */}
      <div className={styles.navArea}>
        <button
          className={styles.nextBtn}
          disabled={!stepComplete}
          onClick={handleNext}
        >
          {stepIndex === steps.length - 1
            ? <><IconSparkle size={18} /> Finish!</>
            : <>Next <IconArrowRight size={18} /></>}
        </button>
      </div>
    </div>

    {/* Printable worksheet — screen hidden, shown on print */}
    {printTarget === 'sheet' && (
      <>
        <style>{`@page { size: A4 portrait; margin: 20mm; }`}</style>
        <div className={styles.printSheet}>
          <div className={styles.printHeader}>
            <span className={styles.printLogo}>🐻 Voice Buddy</span>
            <h1 className={styles.printTitle}>{lesson.emoji} {lesson.printSheet?.title || lesson.title}</h1>
            <div className={styles.printName}>Name: {settings.childName || '______________________'}</div>
          </div>
          <section className={styles.printSection}>
            <h2>What I Will Learn</h2>
            <ul>
              {lesson.printSheet?.facts?.map((fact, i) => <li key={i}>{fact}</li>)}
            </ul>
          </section>
          <section className={styles.printSection}>
            <h2>Colour & Draw</h2>
            <div className={styles.printColourBox}>
              <span className={styles.printEmoji}>{lesson.printSheet?.visual}</span>
              <p className={styles.printPrompt}>{lesson.printSheet?.colourPrompt}</p>
            </div>
          </section>
          <footer className={styles.printFooter}>Voice Buddy | voicebuddy.app</footer>
        </div>
      </>
    )}
  </>
  )
}
