import { useNavigate } from 'react-router-dom'
import styles from './LegalPage.module.css'
import { IconArrowLeft } from '../components/icons.jsx'

export default function TermsOfServicePage() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <button className={styles.home} onClick={() => navigate('/')}>
        <IconArrowLeft size={16} /> Home
      </button>
      <div className={styles.card}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last updated: 30 July 2026</p>

        <p>
          These Terms of Service ("Terms") are an agreement between you and Skillshouse
          ("Skillshouse", "we", "us"), the operator of Buddy ("Buddy", the "Service"), a
          learning app for children used under the supervision of a parent or guardian. By
          creating an account or using Buddy, you agree to these Terms. They are governed by
          the laws of South Africa.
        </p>

        <h2>Who can hold an account</h2>
        <p>
          Buddy accounts must be created and controlled by a parent or legal guardian who is
          at least 18 years old. Children use Buddy only through a child profile created and
          managed by the account holder — a child does not sign up, agree to these Terms, or
          manage billing themselves. You are responsible for all activity under your account
          and for supervising your child's use of the Service.
        </p>

        <h2>What Buddy provides</h2>
        <p>
          Buddy offers voice-based conversations, guided lessons, and learning activities for
          children. Some features are available on a free tier with usage limits; additional
          features and higher usage limits are available through the paid Buddy Pro
          subscription. We may change, add, or remove features at any time.
        </p>

        <h2>Subscriptions and payment</h2>
        <ul>
          <li>Buddy Pro is billed on a recurring basis (monthly or as otherwise stated at checkout) until cancelled.</li>
          <li>Payments are processed by our third-party payment processor, PayFast. We do not receive or store your card details.</li>
          <li>You can cancel your subscription at any time from Parent Settings; cancellation stops future billing but does not automatically refund the current billing period.</li>
          <li>See our <a href="/refunds">Refund &amp; Cancellation Policy</a> for details on refunds.</li>
          <li>We may change subscription pricing on notice; continued use after a price change takes effect means you accept the new price at your next renewal.</li>
        </ul>

        <h2>Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use Buddy for any unlawful purpose or in a way that could harm, disable, or overburden the Service.</li>
          <li>Attempt to circumvent usage limits, security measures, or account controls.</li>
          <li>Reverse engineer, scrape, or resell access to the Service.</li>
          <li>Upload or transmit content through Buddy that is unlawful, abusive, or infringes another person's rights.</li>
        </ul>

        <h2>AI-generated content</h2>
        <p>
          Buddy's conversational replies are generated using third-party AI models (see our{' '}
          <a href="/privacy">Privacy Policy</a> for the providers involved). While we design
          Buddy's prompts and safety guardrails for a children's learning context, AI-generated
          responses may occasionally be inaccurate, incomplete, or unsuitable, and should not be
          relied on as professional, medical, or educational advice. Parental supervision is
          expected during use.
        </p>

        <h2>Your content</h2>
        <p>
          You retain ownership of the information you provide (such as a child's name, age, or
          story requests). You grant us a licence to use this information solely to operate and
          improve the Service, as described in our <a href="/privacy">Privacy Policy</a>.
        </p>

        <h2>Termination</h2>
        <p>
          You may stop using Buddy and delete your account at any time — see our{' '}
          <a href="/data-deletion">Data Deletion Instructions</a>. We may suspend or terminate
          an account that violates these Terms, engages in abusive behaviour, or poses a
          security risk to the Service.
        </p>

        <h2>Disclaimers and limitation of liability</h2>
        <p>
          Buddy is provided "as is" without warranties of any kind, to the maximum extent
          permitted by law. We do not guarantee uninterrupted or error-free operation. To the
          extent permitted by law, Skillshouse's total liability arising from your use of Buddy
          is limited to the amount you paid for the Service in the three months before the
          claim arose.
        </p>

        <h2>Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. Material changes will be reflected by
          updating the "Last updated" date above. Continued use of Buddy after changes take
          effect means you accept the updated Terms.
        </p>

        <h2>Contact us</h2>
        <p>
          Questions about these Terms can be sent to{' '}
          <a href="mailto:Byron@skillshouse.co.za">Byron@skillshouse.co.za</a>.
        </p>
      </div>
    </div>
  )
}
