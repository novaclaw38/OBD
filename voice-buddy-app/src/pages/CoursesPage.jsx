import { useNavigate } from 'react-router-dom'
import { COURSES } from '../utils/courses.js'
import { useSubscription } from '../hooks/useSubscription.jsx'
import { useCompletions } from '../hooks/useCompletions.js'
import { useSpeech } from '../hooks/useSpeech.js'
import UpgradePrompt from '../components/UpgradePrompt.jsx'
import BuddyAvatar from '../components/BuddyAvatar.jsx'
import { useState, useEffect } from 'react'
import { getSettings } from '../utils/storage.js'
import { pickRandom } from '../utils/prompts.js'
import { IconArrowLeft, IconArrowRight, IconLock, IconCheck } from '../components/icons.jsx'
import styles from './CoursesPage.module.css'

const COURSES_INTRO = [
  (names) => `Here are your courses! ${names}. Tap one to hear what's inside!`,
  (names) => `Look what we can learn together! ${names}. Which one sounds fun?`,
  (names) => `So many things to discover — ${names}. Pick one and let's dive in!`,
]

export default function CoursesPage({ session }) {
  const navigate = useNavigate()
  const { isPro } = useSubscription()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [settings] = useState(() => getSettings())
  const durationLabel = (settings.childAge || 7) <= 6 ? '~15 min' : '~30 min'
  const { completions } = useCompletions()
  const speech = useSpeech(settings)

  // Read the course list aloud on arrival — a non-reader can't tell what's
  // here from text alone. Speaks once per visit.
  useEffect(() => {
    const names = COURSES.map((c) => c.title).join(', ')
    speech.speak(pickRandom(COURSES_INTRO)(names))
    return () => speech.stopSpeaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleExpand = (course) => {
    const opening = expanded !== course.id
    setExpanded(opening ? course.id : null)
    if (opening) {
      const lessonNames = course.lessons.map((l) => l.title).join(', ')
      speech.speak(`${course.title}. ${course.description}. It has ${course.lessons.length} lessons: ${lessonNames}.`)
    } else {
      speech.stopSpeaking()
    }
  }

  const handleLesson = (courseId, lessonId) => {
    if (!isPro) { setShowUpgrade(true); return }
    speech.stopSpeaking()
    navigate(`/lesson?course=${courseId}&lesson=${lessonId}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      <header className={styles.header}>
        <button className={styles.back} onClick={() => { speech.stopSpeaking(); navigate('/app') }}><IconArrowLeft size={17} /> Back to Buddy</button>
        <div className={styles.hero}>
          <BuddyAvatar status="happy" size={72} live={false} avatarColor={settings.avatarColor} type={settings.avatarType || 'bear'} costume={settings.costume} />
          <div className={styles.heroBubble}>
            <h1 className={styles.title}>Courses</h1>
            <p className={styles.sub}>Interactive lessons taught by Buddy, just for you</p>
          </div>
        </div>
      </header>

      <div className={styles.grid}>
        {COURSES.map((course) => (
          <div key={course.id} className={styles.courseCard}>
            <div
              className={styles.courseHeader}
              style={{ background: `linear-gradient(135deg, ${course.color[0]}, ${course.color[1]})` }}
            >
              {/* Illustrated cover (FLUX-generated); the gradient behind it
                  doubles as the loading state. */}
              <img
                className={styles.courseCover}
                src={`/courses/${course.id}.webp`}
                alt=""
                loading="lazy"
                width="960"
                height="549"
              />
              {!isPro && <span className={styles.lockBadge}><IconLock size={13} /> Pro</span>}
            </div>
            <div className={styles.courseBody}>
              <h2 className={styles.courseName}>{course.title}</h2>
              <p className={styles.courseDesc}>{course.description}</p>
              <button
                className={styles.expandBtn}
                onClick={() => handleExpand(course)}
              >
                {expanded === course.id ? 'Hide lessons ▲' : `${course.lessons.length} lessons ▼`}
              </button>

              {expanded === course.id && (
                <ul className={styles.lessons}>
                  {course.lessons.map((lesson, i) => (
                    <li key={lesson.id}>
                      <button
                        className={styles.lessonBtn}
                        onClick={() => handleLesson(course.id, lesson.id)}
                      >
                        <span className={styles.lessonNum}>{i + 1}</span>
                        <span className={styles.lessonEmoji}>{lesson.emoji}</span>
                        <span className={styles.lessonTitle}>{lesson.title}</span>
                        {completions.has(`${course.id}:${lesson.id}`) && (
                          <span className={styles.lessonCheck}><IconCheck size={14} /></span>
                        )}
                        <span className={styles.lessonDuration}>{durationLabel}</span>
                        <span className={styles.lessonArrow}>{isPro ? <IconArrowRight size={16} /> : <IconLock size={16} />}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {showUpgrade && (
        <UpgradePrompt session={session} trigger="courses" onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  )
}
