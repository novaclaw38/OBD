import { useState, useRef, useEffect } from 'react'
import styles from './BuddyMenu.module.css'
import { IconMenu, IconMusic, IconBook, IconPalette, IconGear } from './icons.jsx'

// Single overflow menu replacing the old scattered top-bar buttons (customise,
// settings) and mode tiles (songs, learn) — one predictable place for the
// handful of things that live outside the main chat loop.
export default function BuddyMenu({ onSongs, onLearn, onCustomize, onSettings, variant = 'light' }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const pick = (fn) => () => {
    setOpen(false)
    fn?.()
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={`${styles.trigger} ${variant === 'dark' ? styles.dark : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu"
      >
        <IconMenu size={22} />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <button className={styles.item} role="menuitem" onClick={pick(onSongs)}>
            <span className={styles.itemIcon} style={{ color: 'var(--c-pink-d)' }}><IconMusic /></span> Songs
          </button>
          <button className={styles.item} role="menuitem" onClick={pick(onLearn)}>
            <span className={styles.itemIcon} style={{ color: 'var(--c-sky)' }}><IconBook /></span> Learn
          </button>
          <button className={styles.item} role="menuitem" onClick={pick(onCustomize)}>
            <span className={styles.itemIcon} style={{ color: 'var(--c-tangerine)' }}><IconPalette /></span> Customise Buddy
          </button>
          <button className={styles.item} role="menuitem" onClick={pick(onSettings)}>
            <span className={styles.itemIcon} style={{ color: 'var(--c-grape)' }}><IconGear /></span> Parent Settings
          </button>
        </div>
      )}
    </div>
  )
}
