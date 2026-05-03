import React from 'react'

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="card" style={{ maxWidth: '800px', margin: '4rem auto', padding: '3rem', lineHeight: '1.8', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem' }}>
      <button className="primary" onClick={() => window.location.hash = '#/'} style={{ marginBottom: '2rem' }}>← Back to Dashboard</button>
      <h1 style={{ marginBottom: '1rem', fontSize: '2.5rem' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Effective Date: May 3, 2026</p>
      
      <section style={{ marginBottom: '2rem' }}>
        <p>This Privacy Policy describes how LEDGER ("we", "us", or "our") collects, uses, and shares your personal information when you use our financial management platform. We are committed to transparency, login privacy, and total data ownership under our high-level security standard.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>2. Information Collection</h3>
        <p>We collect information you provide directly, including account metadata, financial transaction records, receipt attachments, and authentication tokens.
        <br/><br/>
        Specifically, we collect and store:
        <ul>
          <li><strong>Passkeys</strong>: When you set up a Passkey, we store secure keys and basic information (such as your device type). <strong>Your actual fingerprints or FaceID data never leaves your device and we cannot see it.</strong></li>
          <li><strong>Profile Information</strong>: We update your display name and profile picture from your connected Discord or Google accounts. You can choose to keep or remove this info if you disconnect your account.</li>
          <li><strong>Financial Profiles</strong>: Your accounts and budgets are stored in a secure database.</li>
          <li><strong>Backups</strong>: Encrypted backups can be sent to your personal cloud storage (Google Drive, Dropbox, or OneDrive).</li>
        </ul>
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>3. Use of Information</h3>
        <p>Your information is used solely to provide financial insights, track commitments, and secure your identity via modern biometric protocols. We do not sell, trade, or rent your data to third parties.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>4. Security & Records</h3>
        <p>We use industry-standard military-grade encryption and secure connection protocols. Login events, important changes, and account connections are recorded in a secure log to keep your account safe and accountable.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>5. Your Rights & Privacy & Data Ownership</h3>
        <p>You maintain full privacy & data ownership over your data. You have the right to access, export, or delete your financial and identity data at any time. Deleting an user account removes all historical associations from our active directory.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>6. Contact</h3>
        <p>For privacy-related inquiries, please reach out via the GameProductions support channel on Discord.</p>
      </section>
    </div>
  )
}

export default PrivacyPolicy
