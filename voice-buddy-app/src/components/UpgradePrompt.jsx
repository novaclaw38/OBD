import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import styles from './UpgradePrompt.module.css'
import { IconX, IconStar, IconCheck } from './icons.jsx'

export default function UpgradePrompt({ onClose, session }) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    if (!session) return
    setLoading(true)
    try {
      const res = await fetch('/api/payfast-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          firstName: session.user.user_metadata?.full_name?.split(' ')[0] || 'Parent',
        }),
      })
      const { paymentUrl, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = paymentUrl
    } catch (err) {
      console.error('Upgrade error:', err)
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <div className={styles.glow} />
        <button className={styles.close} onClick={onClose} aria-label="Close"><IconX size={18} /></button>

        <div className={styles.icon}><IconStar size={34} /></div>
        <h2 className={styles.title}>Unlock Buddy Pro</h2>
        <p className={styles.sub}>This feature is part of Buddy Pro</p>

        <ul className={styles.perks}>
          {[
            'All 10 activity modes',
            'Peace of mind camera',
            'Parent voice messages',
            'Gardening & Robotics courses',
            'Wake word & avatar customisation',
            'Unlimited daily messages',
          ].map((perk) => (
            <li key={perk}><span className={styles.perkCheck}><IconCheck size={15} /></span>{perk}</li>
          ))}
        </ul>

        <div className={styles.price}>
          <span className={styles.amount}>R149</span>
          <span className={styles.period}>/month</span>
        </div>
        <p className={styles.trial}>First 10 days completely free</p>

        <button
          className={styles.cta}
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? 'Redirecting…' : 'Start Free Trial'}
        </button>
        <button className={styles.later} onClick={onClose}>Maybe later</button>
      </div>
    </div>
  )
}
