import { useNavigate } from 'react-router-dom'
import styles from './LegalPage.module.css'
import { IconArrowLeft } from '../components/icons.jsx'

export default function DataDeletionPage() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <button className={styles.home} onClick={() => navigate('/')}>
        <IconArrowLeft size={16} /> Home
      </button>
      <div className={styles.card}>
        <h1 className={styles.title}>Data Deletion Instructions</h1>
        <p className={styles.updated}>Last updated: 30 July 2026</p>

        <p>
          You can request deletion of your Buddy account and all associated data —
          child profiles, lesson progress, chat history, and subscription records —
          at any time.
        </p>

        <h2>How to request deletion</h2>
        <p>
          Send a deletion request from the email address on your account to{' '}
          <a href="mailto:Byron@skillshouse.co.za?subject=Delete%20my%20Buddy%20account">Byron@skillshouse.co.za</a>{' '}
          with the subject line "Delete my Buddy account". We'll confirm your identity
          using the account email and process the request within 30 days.
        </p>

        <h2>If you signed in with Facebook</h2>
        <p>
          If you used "Continue with Facebook" to create your account, you can also
          remove Buddy's access directly from Facebook:
        </p>
        <ul>
          <li>Go to Facebook <strong>Settings &amp; Privacy → Settings → Apps and Websites</strong>.</li>
          <li>Find <strong>Buddy</strong> in the list and select <strong>Remove</strong>.</li>
          <li>This revokes Buddy's access to your Facebook account. To also delete your Buddy account and data, email us using the instructions above.</li>
        </ul>

        <h2>What gets deleted</h2>
        <ul>
          <li>Your parent account and login credentials.</li>
          <li>All child profiles created under your account.</li>
          <li>Lesson and course progress, story requests, and screen-time settings.</li>
          <li>Chat history associated with your account.</li>
        </ul>
        <p>
          Payment records required for tax, accounting, or fraud-prevention purposes may be
          retained for a limited period as required by law, even after account deletion.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this process can be sent to{' '}
          <a href="mailto:Byron@skillshouse.co.za">Byron@skillshouse.co.za</a>.
        </p>
      </div>
    </div>
  )
}
