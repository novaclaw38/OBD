import { useNavigate } from 'react-router-dom'
import styles from './LegalPage.module.css'
import { IconArrowLeft } from '../components/icons.jsx'

export default function CookiePolicyPage() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <button className={styles.home} onClick={() => navigate('/')}>
        <IconArrowLeft size={16} /> Home
      </button>
      <div className={styles.card}>
        <h1 className={styles.title}>Cookie Policy</h1>
        <p className={styles.updated}>Last updated: 30 July 2026</p>

        <p>
          Buddy does not use advertising or tracking cookies, and we do not sell or share
          browsing data with advertisers. This policy explains the small amount of local
          storage Buddy does use to function.
        </p>

        <h2>What we use instead of cookies</h2>
        <p>
          Rather than cookies, Buddy primarily uses your browser's local storage (not sent to
          our servers with every request) to:
        </p>
        <ul>
          <li>Keep you signed in between visits.</li>
          <li>Remember child profile selection, screen-time settings, and daily activity progress on the device you're using.</li>
          <li>Remember app preferences so Buddy doesn't reset each time you open it.</li>
        </ul>
        <p>
          This information stays on your device and is cleared if you clear your browser's site
          data, sign out, or delete your account.
        </p>

        <h2>Cookies set by sign-in providers</h2>
        <p>
          If you choose to sign in with Google or Facebook, those providers may set their own
          cookies during the sign-in redirect, governed by their own cookie and privacy
          policies. Buddy does not control these cookies and does not use them for tracking on
          our own site.
        </p>

        <h2>Cookies set by our payment processor</h2>
        <p>
          When you subscribe to Buddy Pro, you are redirected to PayFast to complete payment.
          PayFast may set cookies necessary to process your payment securely, under its own
          cookie policy.
        </p>

        <h2>Managing local storage and cookies</h2>
        <p>
          You can clear local storage and any third-party cookies at any time through your
          browser's settings. Doing so may sign you out of Buddy and reset on-device
          preferences, but will not delete your account or data stored on our servers — see our{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>

        <h2>Contact us</h2>
        <p>
          Questions about this policy can be sent to{' '}
          <a href="mailto:Byron@skillshouse.co.za">Byron@skillshouse.co.za</a>.
        </p>
      </div>
    </div>
  )
}
