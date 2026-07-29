import { useState } from 'react'
import BuddyAvatar from './BuddyAvatar.jsx'
import UpgradePrompt from './UpgradePrompt.jsx'
import { useSubscription } from '../hooks/useSubscription.jsx'
import { COSTUME_OVERLAY_IDS } from './BuddyCostumeOverlays.jsx'
import styles from './AvatarPicker.module.css'
import { IconPencil, IconSparkle, IconLock, IconX } from './icons.jsx'

const AVATARS = [
  { type: 'bear',  label: 'Bear',  color: '#7c3aed' },
  { type: 'cat',   label: 'Cat',   color: '#db2777' },
  { type: 'dog',   label: 'Dog',   color: '#ea580c' },
  { type: 'bunny', label: 'Bunny', color: '#0891b2' },
  { type: 'alien', label: 'Alien', color: '#16a34a' },
  { type: 'dino',  label: 'Dino',  color: '#b45309' },
]

const COSTUMES = [
  { id: 'chef',      label: 'Chef' },
  { id: 'wizard',    label: 'Wizard' },
  { id: 'astronaut', label: 'Astronaut' },
  { id: 'superhero', label: 'Hero' },
]

export default function AvatarPicker({ currentType, currentName, currentColor, currentCostume, onSave, onClose, session }) {
  const { isPro } = useSubscription()
  const [selType,  setSelType]  = useState(currentType  || 'bear')
  const [buddyName, setBuddyName] = useState(currentName || 'Buddy')
  const [selCostume, setSelCostume] = useState(currentCostume || null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const selAvatar = AVATARS.find((a) => a.type === selType) || AVATARS[0]

  const handlePickCostume = (id) => {
    if (!isPro) { setShowUpgrade(true); return }
    setSelCostume((prev) => (prev === id ? null : id))
  }

  const handleSave = () => {
    onSave({ type: selType, name: buddyName.trim() || 'Buddy', color: selAvatar.color, costume: isPro ? selCostume : null })
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <h2 className={styles.title}>Choose Your Buddy!</h2>

        {/* Live preview */}
        <div className={styles.preview}>
          <BuddyAvatar type={selType} costume={selCostume} status="idle" avatarColor={selAvatar.color} size={110} />
          <div className={styles.nameWrap}>
            <input
              className={styles.nameInput}
              value={buddyName}
              onChange={(e) => setBuddyName(e.target.value)}
              maxLength={16}
              placeholder="Buddy"
              aria-label="Buddy name"
            />
            <span className={styles.nameHint}>tap to rename <IconPencil size={13} /></span>
          </div>
        </div>

        {/* Avatar grid */}
        <div className={styles.grid}>
          {AVATARS.map((a) => (
            <button
              key={a.type}
              className={`${styles.avatarBtn} ${selType === a.type ? styles.selected : ''}`}
              style={{ '--sel-color': a.color }}
              onClick={() => setSelType(a.type)}
            >
              <BuddyAvatar type={a.type} status="idle" avatarColor={a.color} size={56} live={false} />
              <span className={styles.avatarLabel}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* Premium costumes (Pro) */}
        <p className={styles.costumeLabel}>Costumes {!isPro && <IconLock size={12} />}</p>
        <div className={styles.costumeGrid}>
          {COSTUMES.map((c) => (
            <button
              key={c.id}
              className={`${styles.costumeBtn} ${selCostume === c.id ? styles.selected : ''} ${!isPro ? styles.lockedCostume : ''}`}
              onClick={() => handlePickCostume(c.id)}
            >
              <BuddyAvatar
                type={selType}
                costume={c.id}
                status="idle"
                avatarColor={selAvatar.color}
                size={44}
                live={false}
              />
              <span className={styles.avatarLabel}>{c.label}</span>
              {!isPro && <span className={styles.costumeLock}><IconLock size={11} /></span>}
            </button>
          ))}
          {selCostume && (
            <button className={styles.costumeClear} onClick={() => setSelCostume(null)} aria-label="Remove costume">
              <IconX size={14} />
            </button>
          )}
        </div>

        <button className={styles.saveBtn} onClick={handleSave}>
          Let's go! <IconSparkle size={18} />
        </button>
        <button className={styles.cancelBtn} onClick={onClose}>
          Maybe later
        </button>
      </div>

      {showUpgrade && <UpgradePrompt session={session} onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}
