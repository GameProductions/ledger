import React from 'react'

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="card" style={{ maxWidth: '800px', margin: '4rem auto', padding: '3rem', lineHeight: '1.8', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem' }}>
      <button className="primary" onClick={() => window.location.hash = '#/'} style={{ marginBottom: '2rem' }}>← Back to Dashboard</button>
      <h1 style={{ marginBottom: '1rem', fontSize: '2.5rem' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Effective Date: March 23, 2026</p>
      
      <section style={{ marginBottom: '2rem' }}>
        <h3>1. Introduction</h3>
        <p>This Privacy Policy describes how LEDGER ("we", "us", or "our") collects, uses, and shares your personal information when you use our financial management platform. We are committed to transparency and data sovereignty.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>2. Information Collection</h3>
        <p>We collect information you provide directly, including account metadata, financial transaction records, and authentication tokens. We utilize local storage and encrypted Cloudflare D1 databases for data persistence.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>3. Use of Information</h3>
        <p>Your information is used solely to provide financial insights, track commitments, and calculate your "Safety Number". We do not sell, trade, or rent your data to third parties.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>4. Security</h3>
        <p>We implement industry-standard AES-256 encryption and HSTS protocols to protect your data. However, no method of transmission over the Internet is 100% secure.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>5. Your Rights</h3>
        <p>You have the right to access, export, or delete your financial data at any time via the Sovereign Export and Household Management tools in your dashboard.</p>
      </section>

      <section>
        <h3>6. Contact</h3>
        <p>For privacy-related inquiries, please reach out via the GameProductions support channel on Discord.</p>
      </section>
    </div>
  )
}

export default PrivacyPolicy
