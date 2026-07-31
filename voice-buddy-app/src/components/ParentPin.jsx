import { useState, useEffect } from 'react'
import { hashPin, getPinLock, savePinLock } from '../utils/storage.js'
import styles from './ParentPin.module.css'
import { IconLock } from './icons.jsx'

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30000

export default function ParentPin({ correctPinHash, onSuccess, onCreate }) {
  // With no PIN on file this is a first-run setup, not a challenge. Accounts
  // used to be given a default of 1234, which made the gate meaningless.
  const isSetup = !correctPinHash
  const [stage, setStage] = useState('enter') // 'enter' | 'confirm'
  const [firstPin, setFirstPin] = useState('')
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  // Persisted across reloads so the lockout can't be dodged by refreshing.
  const [lock, setLock] = useState(() => getPinLock())
  const [remaining, setRemaining] = useState(0)

  const locked = remaining > 0

  // Tick down the lockout countdown.
  useEffect(() => {
    if (lock.lockedUntil <= Date.now()) { setRemaining(0); return }
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((lock.lockedUntil - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        const cleared = { attempts: 0, lockedUntil: 0 }
        setLock(cleared)
        savePinLock(cleared)
        clearInterval(id)
      }
    }, 250)
    return () => clearInterval(id)
  }, [lock.lockedUntil])

  const handleDigit = async (d) => {
    if (locked) return
    const next = input + d
    if (next.length < 4) { setInput(next); return }

    const attempt = next
    setInput('')

    // First-run setup: capture a PIN, then confirm it before saving. No
    // lockout applies here — there's nothing to brute-force yet.
    if (isSetup) {
      if (stage === 'enter') {
        setFirstPin(attempt)
        setStage('confirm')
        return
      }
      if (attempt === firstPin) {
        onCreate?.(await hashPin(attempt))
      } else {
        setFirstPin('')
        setStage('enter')
        setShake(true)
        setTimeout(() => setShake(false), 500)
      }
      return
    }

    const attemptHash = await hashPin(attempt)
    if (correctPinHash && attemptHash === correctPinHash) {
      const cleared = { attempts: 0, lockedUntil: 0 }
      setLock(cleared)
      savePinLock(cleared)
      onSuccess()
    } else {
      const tries = lock.attempts + 1
      const nextLock = tries >= MAX_ATTEMPTS
        ? { attempts: tries, lockedUntil: Date.now() + LOCKOUT_MS }
        : { attempts: tries, lockedUntil: 0 }
      setLock(nextLock)
      savePinLock(nextLock)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  const handleDelete = () => setInput((p) => p.slice(0, -1))

  return (
    <div className={styles.overlay}>
      <div className={`${styles.card} ${shake ? styles.shake : ''}`}>
        <div className={styles.lock}><IconLock size={30} /></div>
        <h2 className={styles.title}>{isSetup ? 'Set Up Parent PIN' : 'Parent Area'}</h2>
        <p className={styles.sub}>
          {isSetup
            ? (stage === 'enter'
                ? 'Create a 4-digit PIN to protect settings'
                : 'Re-enter your PIN to confirm')
            : locked
              ? `Too many tries — wait ${remaining}s`
              : lock.attempts > 0
                ? `Enter your PIN (${MAX_ATTEMPTS - lock.attempts} left)`
                : 'Enter your PIN'}
        </p>

        <div className={styles.dots}>
          {[0,1,2,3].map((i) => (
            <div key={i} className={`${styles.dot} ${input.length > i ? styles.filled : ''}`} />
          ))}
        </div>

        <div className={styles.keypad}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => (
            <button
              key={i}
              className={`${styles.key} ${key === '' ? styles.empty : ''}`}
              onClick={() => key === '⌫' ? handleDelete() : key && handleDigit(key)}
              disabled={!key || locked}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
