import { useState } from 'react'
import BuddyAvatar from '../BuddyAvatar.jsx'
import styles from './RewardScreen.module.css'
import { IconStar, IconPrinter, IconTrophy, IconArrowLeft } from '../icons.jsx'

const STAR_COUNT = 12

export default function RewardScreen({ lesson, course, childName, avatarType, avatarColor, costume, onBack }) {
  const [printTarget, setPrintTarget] = useState(null)

  const handlePrint = (target) => {
    setPrintTarget(target)
    // Give React 80 ms to commit the print component into the DOM before opening dialog
    setTimeout(() => {
      window.print()
      setPrintTarget(null)
    }, 80)
  }

  const today = new Date().toLocaleDateString()

  return (
    <>
      {/* ── Screen UI (hidden during print via @media print rule) ── */}
      <div className={styles.screen}>
        {/* Star burst */}
        <div className={styles.starsWrap} aria-hidden="true">
          {Array.from({ length: STAR_COUNT }).map((_, i) => (
            <span key={i} className={styles.star} style={{ '--i': i }}><IconStar size={26} /></span>
          ))}
        </div>

        {/* Result card */}
        <div className={styles.content}>
          <div className={styles.buddyWrap}>
            <BuddyAvatar type={avatarType || 'bear'} costume={costume} status="happy" avatarColor={avatarColor} size={130} />
          </div>
          <h1 className={styles.heading}>You did it!</h1>
          <p className={styles.sub}>
            You finished <strong>{lesson.title}</strong>!
          </p>

          <div className={styles.actions}>
            <button className={styles.sheetBtn} onClick={() => handlePrint('sheet')}>
              <IconPrinter size={18} /> Print your worksheet
            </button>
            <button className={styles.certBtn} onClick={() => handlePrint('cert')}>
              <IconTrophy size={18} /> Print your certificate
            </button>
            <button className={styles.backBtn} onClick={onBack}>
              <IconArrowLeft size={18} /> Back to Courses
            </button>
          </div>
        </div>
      </div>

      {/* ── Worksheet — hidden on screen, visible during print when printTarget === 'sheet' ── */}
      <div className={styles.printOnly}>
        {printTarget === 'sheet' && (
          <>
            <style>{`@page { size: A4 portrait; margin: 20mm; }`}</style>
            <div className={styles.worksheet}>
              <div className={styles.worksheetHeader}>
                <span className={styles.worksheetBuddy}>🐻</span>
                <h1 className={styles.worksheetTitle}>{lesson.title}</h1>
              </div>

              <div className={styles.worksheetSection}>
                <h2 className={styles.worksheetSectionHeading}>What I Learned</h2>
                <ul className={styles.worksheetFacts}>
                  {lesson.printSheet?.facts?.map((fact, i) => (
                    <li key={i}>{fact}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.worksheetSection}>
                <h2 className={styles.worksheetSectionHeading}>Colouring Time!</h2>
                <div className={styles.colourArea}>
                  <span className={styles.colourVisual}>{lesson.printSheet?.visual}</span>
                  <p className={styles.colourPrompt}>{lesson.printSheet?.colourPrompt}</p>
                </div>
              </div>

              <div className={styles.worksheetFooter}>
                Voice Buddy | voicebuddy.app
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Certificate — hidden on screen, visible during print when printTarget === 'cert' ── */}
      <div className={styles.printOnly}>
        {printTarget === 'cert' && (
          <>
            <style>{`@page { size: A4 landscape; margin: 15mm; }`}</style>
            <div className={styles.certificate}>
              <div className={styles.certStars}>⭐⭐⭐⭐⭐</div>

              <h1 className={styles.certHeading}>Certificate of Achievement</h1>
              <p className={styles.certSubheading}>awarded with pride by Voice Buddy</p>

              <p className={styles.certBody}>
                This certifies that{' '}
                <span className={styles.certName}>{childName || 'a brilliant learner'}</span>
                {' '}has completed{' '}
                <span className={styles.certLesson}>{lesson.title}</span>
                {' '}in{' '}
                <span className={styles.certCourse}>{course.title}</span>.
              </p>

              <p className={styles.certDate}>Completed on {today}</p>

              <p className={styles.certSignature}>🐻 — Buddy</p>

              <div className={styles.certStarsBottom}>⭐⭐⭐⭐⭐⭐⭐</div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
