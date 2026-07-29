import { useState, useEffect, useRef, useCallback } from 'react'
import { NURSERY_RHYMES } from '../utils/nurseryRhymes.js'
import styles from './SingAlong.module.css'
import { IconArrowLeft, IconMusic, IconPlay, IconPause, IconRepeat } from './icons.jsx'
import BuddyAvatar from './BuddyAvatar.jsx'
import { motion, AnimatePresence } from 'motion/react'

// Spring used for screen swaps (pick <-> sing <-> credits). AnimatePresence
// gives us real exit animations, which CSS alone can't do on unmount.
const SCREEN_SPRING = { type: 'spring', stiffness: 340, damping: 32 }
const screenMotion = {
  initial: { opacity: 0, x: 42, scale: 0.985 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit:    { opacity: 0, x: -42, scale: 0.985 },
  transition: SCREEN_SPRING,
}

// Sing-along plays a REAL sung recording per song. Recordings have no
// per-word timestamps, so the karaoke highlight is driven by elapsed
// playback time within the song's [leadIn, outro] window (see
// nurseryRhymes.js), distributed across words by character length (longer
// words get proportionally more time) for a natural-feeling bounce.
export default function SingAlong({ onExit, avatarColor, avatarType = 'bear', costume }) {
  const [screen, setScreen] = useState('pick') // 'pick' | 'sing' | 'credits'
  const [song, setSong] = useState(null)
  const [globalWord, setGlobalWord] = useState(-1) // index across the whole song
  const [isPlaying, setIsPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const audioRef = useRef(null)
  const rafRef = useRef(null)

  // Flatten lyrics into a word map so we can locate the active line+word
  // from a single global word index.
  const buildWordMap = useCallback((rhyme) => {
    const map = [] // { line, word, len }
    rhyme.lines.forEach((line, li) => {
      line.trim().split(/\s+/).filter(Boolean).forEach((w, wi) => {
        map.push({ line: li, word: wi, len: w.length })
      })
    })
    return map
  }, [])

  const stopRaf = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }

  const startTracking = useCallback((rhyme) => {
    stopRaf()
    const map = buildWordMap(rhyme)
    const totalChars = map.reduce((s, w) => s + w.len, 0) || 1
    const leadIn = rhyme.leadIn || 0
    const tick = () => {
      const audio = audioRef.current
      if (audio && audio.duration > 0) {
        // Map word progress across [leadIn, outro] — the part of the
        // recording that's actually singing — instead of the full file,
        // so lead-in music and a trailing instrumental don't throw off sync.
        const outro = rhyme.outro || audio.duration
        const activeSpan = Math.max(outro - leadIn, 0.01)
        if (audio.currentTime < leadIn) {
          setGlobalWord(-1)
        } else {
          const progress = Math.min((audio.currentTime - leadIn) / activeSpan, 1)
          const charPos = progress * totalChars
          let cum = 0
          let idx = map.length - 1
          for (let i = 0; i < map.length; i++) {
            cum += map[i].len
            if (charPos <= cum) { idx = i; break }
          }
          setGlobalWord(idx)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [buildWordMap])

  const playSong = useCallback((rhyme) => {
    stopRaf()
    if (audioRef.current) { audioRef.current.pause() }
    const audio = new Audio(rhyme.audio)
    audio.preload = 'auto'
    audioRef.current = audio
    setGlobalWord(-1)
    setEnded(false)
    audio.addEventListener('ended', () => {
      stopRaf()
      setIsPlaying(false)
      setEnded(true)
      setGlobalWord(-1)
    })
    audio.addEventListener('play', () => { setIsPlaying(true); startTracking(rhyme) })
    audio.addEventListener('pause', () => { setIsPlaying(false); stopRaf() })
    audio.play().catch(() => { setIsPlaying(false) })
  }, [startTracking])

  // Cleanup on unmount
  useEffect(() => () => {
    stopRaf()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
  }, [])

  const handlePickSong = (rhyme) => {
    setSong(rhyme)
    setScreen('sing')
    setTimeout(() => playSong(rhyme), 250)
  }

  const handlePlayPause = () => {
    const audio = audioRef.current
    if (!audio || audio.ended || ended) { if (song) playSong(song); return }
    if (audio.paused) { audio.play().catch(() => {}) }
    else { audio.pause() }
  }

  const handleRestart = () => { if (song) playSong(song) }

  const handleBackToPick = () => {
    stopRaf()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setScreen('pick')
    setSong(null)
    setGlobalWord(-1)
    setIsPlaying(false)
    setEnded(false)
  }

  /* ── Song Picker ──────────────────────────────── */
  let content = null
  if (screen === 'pick') {
    content = (
      <motion.div key="pick" className={styles.screenWrap} {...screenMotion}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={onExit}><IconArrowLeft size={17} /> Back</button>
          <span className={styles.topTitle}><IconMusic size={19} /> Sing Along!</span>
          <div style={{ width: 70 }} />
        </div>

        <p className={styles.pickTitle}>Pick a song!</p>

        <div className={styles.songList}>
          {NURSERY_RHYMES.map((r, i) => (
            <button
              key={r.id}
              className={styles.songBtn}
              style={{ animationDelay: `${i * 0.04}s` }}
              onClick={() => handlePickSong(r)}
            >
              <span className={styles.songEmoji}>{r.emoji}</span>
              <span className={styles.songName}>{r.title}</span>
              <span className={styles.songPlayIcon} aria-hidden="true"><IconPlay size={17} /></span>
            </button>
          ))}
        </div>

        <button className={styles.creditsLink} onClick={() => setScreen('credits')}>
          Song credits
        </button>
      </motion.div>
    )
  }

  /* ── Credits (licence attribution) ────────────── */
  if (screen === 'credits') {
    content = (
      <motion.div key="credits" className={styles.screenWrap} {...screenMotion}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => setScreen('pick')}><IconArrowLeft size={17} /> Back</button>
          <span className={styles.topTitle}>Song credits</span>
          <div style={{ width: 70 }} />
        </div>
        <div className={styles.creditsList}>
          <p className={styles.creditsIntro}>
            Recordings from Wikimedia Commons, used under their licences:
          </p>
          {NURSERY_RHYMES.map((r) => (
            <a
              key={r.id}
              className={styles.creditRow}
              href={r.credit.source}
              target="_blank"
              rel="noreferrer"
            >
              <span className={styles.creditSong}>{r.emoji} {r.title}</span>
              <span className={styles.creditMeta}>{r.credit.author} · {r.credit.license}</span>
            </a>
          ))}
        </div>
      </motion.div>
    )
  }

  /* ── Sing Screen ──────────────────────────────── */
  if (screen === 'sing' && song) {
    // Resolve global word index → which line, and which word within it.
    const map = buildWordMap(song)
    const active = globalWord >= 0 && globalWord < map.length ? map[globalWord] : null
    const activeLine = active ? active.line : -1
    const activeWord = active ? active.word : -1

    content = (
      <motion.div key="sing" className={styles.screenWrap} {...screenMotion}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={handleBackToPick}><IconMusic size={17} /> Songs</button>
        <span className={styles.topTitle}>{song.emoji} {song.title}</span>
        <div style={{ width: 70 }} />
      </div>

      {/* Buddy sings along — mouth synced to the recording's loudness */}
      <div className={styles.singBuddy}>
        <BuddyAvatar
          status={ended ? 'happy' : isPlaying ? 'speaking' : 'idle'}
          avatarColor={avatarColor}
          type={avatarType}
          costume={costume}
          size={104}
          audioRef={audioRef}
        />
      </div>

      <div className={styles.lyricsBlock}>
        {song.lines.map((line, i) => {
          const words = line.trim().split(/\s+/).filter(Boolean)
          const cls = [
            styles.lyricLine,
            i === activeLine ? styles.activeLine : '',
            i < activeLine ? styles.doneLine : '',
          ].join(' ')
          return (
            <p key={i} className={cls}>
              {i === activeLine
                ? words.map((word, wi) => (
                    <span key={wi} className={`${styles.word} ${wi === activeWord ? styles.activeWord : ''}`}>
                      {wi === activeWord && <span className={styles.dot} aria-hidden="true">●</span>}
                      {word}
                    </span>
                  ))
                : line}
            </p>
          )
        })}
      </div>

      <p className={styles.statusLine}>
        {ended ? 'Great singing!' : isPlaying ? 'Sing along!' : 'Paused — tap play'}
      </p>

      <div className={styles.controls}>
        <button
          className={styles.replayBtn}
          onClick={handleRestart}
          aria-label="Start the song again"
        >
          <IconRepeat size={17} /> Again
        </button>
        <button
          className={styles.nextBtn}
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {ended ? <><IconRepeat size={17} /> Sing again</> : isPlaying ? <><IconPause size={17} /> Pause</> : <><IconPlay size={17} /> Play</>}
        </button>
      </div>
      </motion.div>
    )
  }

  return (
    <div className={styles.overlay}>
      <AnimatePresence mode="wait" initial={false}>
        {content}
      </AnimatePresence>
    </div>
  )
}
