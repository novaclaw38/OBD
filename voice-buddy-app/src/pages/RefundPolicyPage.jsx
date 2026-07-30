import { useNavigate } from 'react-router-dom'
import styles from './LegalPage.module.css'
import { IconArrowLeft } from '../components/icons.jsx'

export default function RefundPolicyPage() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <button className={styles.home} onClick={() => navigate('/')}>
        <IconArrowLeft size={16} /> Home
      </button>
      <div className={styles.card}>
        <h1 className={styles.title}>Refund &amp; Cancellation Policy</h1>
        <p className={styles.updated}>Last updated: 30 July 2026</p>

        <p>
          This policy explains how billing, cancellation, and refunds work for Buddy Pro,
          Buddy's paid subscription. It should be read alongside our{' '}
          <a href="/terms">Terms of Service</a>.
        </p>

        <h2>Billing</h2>
        <p>
          Buddy Pro renews automatically at the end of each billing period until you cancel.
          Payments are processed by PayFast; charges appear on your statement under Skillshouse
          or PayFast's merchant descriptor. It is your responsibility to keep your payment
          details up to date to avoid a lapse in service.
        </p>

        <h2>How to cancel</h2>
        <p>
          You can cancel Buddy Pro at any time from Parent Settings. Cancelling stops future
          renewals — your Pro access continues until the end of the billing period you've
          already paid for, and then the account reverts to the free tier.
        </p>

        <h2>Refunds</h2>
        <ul>
          <li>Because Buddy Pro grants immediate access to Pro features for the full billing period, payments are generally non-refundable once a billing period has started.</li>
          <li>If you were charged in error (for example, a duplicate charge or a charge after you had already cancelled), contact us and we will investigate and refund the erroneous charge.</li>
          <li>If you believe Buddy Pro was not delivered as described due to a fault on our side, contact us within 14 days of the charge and we will review your request in good faith. Refunds outside of this policy are at Skillshouse's discretion.</li>
          <li>Approved refunds are issued to the original payment method via PayFast and may take several business days to reflect, depending on your bank or card issuer.</li>
        </ul>

        <h2>Free tier and trials</h2>
        <p>
          Free-tier usage and any promotional trial period are not billed and are not eligible
          for a refund, since no payment was made.
        </p>

        <h2>How to request a refund</h2>
        <p>
          Email{' '}
          <a href="mailto:Byron@skillshouse.co.za?subject=Refund%20request">Byron@skillshouse.co.za</a>{' '}
          with the email address on your account and the date of the charge you're asking
          about. We aim to respond within a few business days.
        </p>

        <h2>Your statutory rights</h2>
        <p>
          Nothing in this policy limits any refund or cancellation rights you have under
          South African consumer protection law that cannot be excluded by agreement.
        </p>
      </div>
    </div>
  )
}
