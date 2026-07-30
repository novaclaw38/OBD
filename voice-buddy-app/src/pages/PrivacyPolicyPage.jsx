import { useNavigate } from 'react-router-dom'
import styles from './LegalPage.module.css'
import { IconArrowLeft } from '../components/icons.jsx'

export default function PrivacyPolicyPage() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <button className={styles.home} onClick={() => navigate('/')}>
        <IconArrowLeft size={16} /> Home
      </button>
      <div className={styles.card}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: 30 July 2026</p>

        <p>
          Buddy ("Buddy", "we", "us") is a learning app for children, used under the
          supervision of a parent or guardian who creates and controls the account. This
          policy explains what information we collect, how we use it, and the choices you
          have.
        </p>

        <h2>Who this applies to</h2>
        <p>
          Buddy accounts are created and managed by a parent or guardian. Children do not
          sign up themselves or manage their own account, subscription, or settings.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li><strong>Account information:</strong> the parent's email address, and if you sign in with Facebook, your Facebook name, email address, and profile picture.</li>
          <li><strong>Child profile information:</strong> a name or nickname and age/grade level entered by the parent, used to personalize lessons.</li>
          <li><strong>Voice and chat interactions:</strong> audio captured from the microphone during a session is transcribed and sent to our AI provider to generate a reply, and the reply is converted back to speech. We use this only to run the conversation in real time.</li>
          <li><strong>Learning activity:</strong> lesson and course progress, screen-time settings, and story requests configured by the parent.</li>
          <li><strong>Payment information:</strong> if you subscribe to Buddy Pro, payment is handled by our payment processor, PayFast. We receive confirmation of payment status only — we do not receive or store your card details.</li>
          <li><strong>Technical data:</strong> basic device and usage logs used to keep the service reliable and secure.</li>
        </ul>

        <h2>How we use information</h2>
        <ul>
          <li>To operate the core features of Buddy: conversations, lessons, and progress tracking.</li>
          <li>To let a parent manage settings, screen time, and multiple child profiles.</li>
          <li>To process subscription payments and manage billing.</li>
          <li>To maintain security, prevent abuse, and enforce fair-use rate limits.</li>
        </ul>

        <h2>Third parties we use</h2>
        <ul>
          <li><strong>Supabase</strong> — authentication and database hosting.</li>
          <li><strong>Google Cloud Text-to-Speech</strong> — converts Buddy's replies into spoken audio.</li>
          <li><strong>Groq</strong> — powers the AI conversation used to generate Buddy's replies.</li>
          <li><strong>PayFast</strong> — processes subscription payments.</li>
          <li><strong>Meta / Facebook Login</strong> — optional sign-in method, if you choose to use it.</li>
        </ul>
        <p>
          These providers process data only as needed to deliver the feature they support,
          and are not permitted to use it for their own advertising purposes.
        </p>

        <h2>Data retention</h2>
        <p>
          We keep account, profile, and progress data for as long as the account is active.
          Voice audio is used to generate a response in real time and is not kept for
          long-term storage beyond what is needed to operate the conversation. You can
          request deletion of your account and associated data at any time — see our{' '}
          <a href="/data-deletion">Data Deletion Instructions</a>.
        </p>

        <h2>Children's privacy</h2>
        <p>
          Buddy is designed to be used by children only under a parent or guardian's account
          and supervision. We do not knowingly allow children to create their own account,
          and we do not use children's data for advertising or sell it to third parties.
        </p>

        <h2>Your choices</h2>
        <ul>
          <li>You can update or remove a child profile at any time from Parent Settings.</li>
          <li>You can cancel your subscription at any time from Parent Settings.</li>
          <li>You can request full account and data deletion — see <a href="/data-deletion">Data Deletion Instructions</a>.</li>
        </ul>

        <h2>Contact us</h2>
        <p>
          Questions about this policy or your data can be sent to{' '}
          <a href="mailto:Byron@skillshouse.co.za">Byron@skillshouse.co.za</a>.
        </p>
      </div>
    </div>
  )
}
