import React from 'react'

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="card" style={{ maxWidth: '800px', margin: '4rem auto', padding: '3rem', lineHeight: '1.8', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem' }}>
      <button className="primary" onClick={() => window.location.hash = '#/'} style={{ marginBottom: '2rem' }}>← Back to Dashboard</button>
      <h1 style={{ marginBottom: '1rem', fontSize: '2.5rem' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Effective Date: March 28, 2026</p>
      
      <section style={{ marginBottom: '2rem' }}>
        <h3>1. Introduction</h3>
        <p>This Privacy Policy describes how LEDGER ("we", "us", or "our") collects, uses, and shares your personal information when you use our financial management platform. We are committed to transparency, biometric privacy, and data sovereignty.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>2. Information Collection</h3>
        <p>We collect information you provide directly, including account metadata, financial transaction records, receipt attachments, and authentication tokens.
        <br/><br/>
        Specifically, we collect and store:
        <ul>
          <li><strong>Biometric Registry Metadata</strong>: When you enroll a Passkey, we store public keys and metadata (e.g., provider name, device type). <strong>Actual biometric data (fingerprints, FaceID) never leaves your device and is not accessible to LEDGER.</strong></li>
          <li><strong>Identity Synchronization Assets</strong>: We synchronize display names and avatar URLs from linked Discord or Google accounts. You may choose to retain or revert these assets when unlinking an account.</li>
          <li><strong>Financial Profiles</strong>: Your accounts and budgets are stored in a sovereign edge database (Cloudflare D1).</li>
          <li><strong>Redundancy Backups</strong>: Encrypted backups are optionally pushed to your personal cloud storage (GDrive/Dropbox/OneDrive).</li>
        </ul>
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>3. Use of Information</h3>
        <p>Your information is used solely to provide financial insights, track commitments, and secure your identity via modern biometric protocols. We do not sell, trade, or rent your data to third parties.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>4. Security & Forensic Integrity</h3>
        <p>We implement industry-standard AES-256 encryption, HSTS protocols, and WebAuthn (Passkey) standards. Authentication events and administrative overrides are recorded in a Forensic Audit Trail for accountability and security monitoring.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>5. Your Rights & Sovereignty</h3>
        <p>You maintain full sovereignty over your data. You have the right to access, export, or delete your financial and identity data at any time. Forensically purging an identity node removes all historical associations from our active directory.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>6. Contact</h3>
        <p>For privacy-related inquiries, please reach out via the GameProductions support channel on Discord.</p>
      </section>

      <footer style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <p>Updated as of March 28, 2026 (v3.11.8). This document is updated whenever significant changes are made to the LEDGER data processing or identity engines.</p>
      </footer>
    </div>
  )
}

export default PrivacyPolicy
