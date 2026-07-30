import { useState, useEffect, useCallback } from 'react'
import BuddyAvatar from './BuddyAvatar.jsx'
import UpgradePrompt from './UpgradePrompt.jsx'
import { useSubscription } from '../hooks/useSubscription.jsx'
import { getActiveChildId, setActiveChildId } from '../utils/storage.js'
import { listChildren, createChild, updateChild, deleteChild } from '../services/childrenService.js'
import styles from './ChildrenManager.module.css'
import { IconPlus, IconPencil, IconCheck, IconX } from './icons.jsx'

// Free accounts get one child; Pro accounts can add siblings. New children
// start on a rotating avatar so two kids on the same device don't look
// identical until a parent (or the kid) picks something in the app.
const STARTER_AVATARS = [
  { type: 'bear',  color: '#7c3aed' },
  { type: 'cat',   color: '#db2777' },
  { type: 'dog',   color: '#ea580c' },
  { type: 'bunny', color: '#0891b2' },
  { type: 'alien', color: '#16a34a' },
  { type: 'dino',  color: '#b45309' },
]

export default function ChildrenManager({ onSwitched, session }) {
  const { isPro } = useSubscription()
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveIdState] = useState(() => getActiveChildId())
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => {
    setLoading(true)
    listChildren().then(setChildren).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleSwitch = (id) => {
    if (id === activeId) return
    setActiveChildId(id)
    setActiveIdState(id)
    onSwitched?.()
  }

  const handleAdd = async () => {
    if (!isPro && children.length >= 1) { setShowUpgrade(true); return }
    setBusy(true)
    try {
      const next = STARTER_AVATARS[children.length % STARTER_AVATARS.length]
      const child = await createChild({
        name: `Child ${children.length + 1}`,
        buddyName: 'Buddy',
        avatarType: next.type,
        avatarColor: next.color,
      })
      setChildren((prev) => [...prev, child])
      handleSwitch(child.id)
    } catch (err) {
      console.error('Failed to add child:', err)
    } finally {
      setBusy(false)
    }
  }

  const startRename = (child) => {
    setRenamingId(child.id)
    setRenameValue(child.name)
  }

  const saveRename = async (id) => {
    const name = renameValue.trim()
    setRenamingId(null)
    if (!name) return
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
    try {
      await updateChild(id, { name })
    } catch (err) {
      console.error('Failed to rename child:', err)
    }
  }

  const handleRemove = async (id) => {
    if (children.length <= 1) return // always keep at least one profile
    if (!window.confirm('Remove this child profile? Their progress will be deleted too.')) return
    setChildren((prev) => prev.filter((c) => c.id !== id))
    try {
      await deleteChild(id)
      if (id === activeId) {
        const fallback = children.find((c) => c.id !== id)
        if (fallback) handleSwitch(fallback.id)
      }
    } catch (err) {
      console.error('Failed to remove child:', err)
      reload()
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeaderRow}>
        <h2 className={styles.sectionTitle}>Children</h2>
      </div>
      <p className={styles.hint} style={{ marginBottom: 16 }}>
        Switch which child is using this device, or add a sibling.
      </p>

      {loading ? (
        <p className={styles.hint}>Loading…</p>
      ) : (
        <div className={styles.list}>
          {children.map((child) => (
            <div
              key={child.id}
              className={`${styles.card} ${child.id === activeId ? styles.activeCard : ''}`}
            >
              <button className={styles.cardMain} onClick={() => handleSwitch(child.id)}>
                <BuddyAvatar
                  type={child.avatar_type}
                  avatarColor={child.avatar_color}
                  status="idle"
                  live={false}
                  size={48}
                />
                <div className={styles.cardBody}>
                  {renamingId === child.id ? (
                    <input
                      className={styles.renameInput}
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveRename(child.id) }}
                      onBlur={() => saveRename(child.id)}
                      maxLength={20}
                    />
                  ) : (
                    <span className={styles.cardName}>{child.name || 'Unnamed'}</span>
                  )}
                  <span className={styles.cardBuddy}>with {child.buddy_name}</span>
                </div>
                {child.id === activeId && (
                  <span className={styles.activeBadge}><IconCheck size={12} /> Active</span>
                )}
              </button>
              <div className={styles.cardActions}>
                <button
                  className={styles.iconBtn}
                  onClick={(e) => { e.stopPropagation(); startRename(child) }}
                  aria-label={`Rename ${child.name}`}
                >
                  <IconPencil size={15} />
                </button>
                {children.length > 1 && (
                  <button
                    className={styles.iconBtn}
                    onClick={(e) => { e.stopPropagation(); handleRemove(child.id) }}
                    aria-label={`Remove ${child.name}`}
                  >
                    <IconX size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className={styles.addBtn} onClick={handleAdd} disabled={busy}>
        <IconPlus size={16} /> Add a child
      </button>
      {!isPro && (
        <p className={styles.proNote}>Free accounts get 1 child — upgrade to Pro to add siblings.</p>
      )}

      {showUpgrade && <UpgradePrompt session={session} trigger="child" onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}
