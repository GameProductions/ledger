import React from 'react'

const TermsOfService: React.FC = () => {
  return (
    <div className="card" style={{ maxWidth: '800px', margin: '4rem auto', padding: '3rem', lineHeight: '1.8', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem' }}>
      <button className="primary" onClick={() => window.location.hash = '#/'} style={{ marginBottom: '2rem' }}>← Back to Dashboard</button>
      <h1 style={{ marginBottom: '1rem', fontSize: '2.5rem' }}>Terms of Service</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Last Updated: May 3, 2026</p>
      
      <section style={{ marginBottom: '2rem' }}>
        <p>By using the LEDGER platform (the "Service"), you agree to follow these Terms of Service. If you do not agree, please do not use the Service.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>2. Description of Service</h3>
        <p>LEDGER is a financial tool that keeps your data in a secure database and <strong>can back it up to your personal cloud storage for extra safety.</strong></p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>3. Accuracy of Data</h3>
        <p>The financial metrics provided are estimates based on your data. We are not financial advisors and provide this info for your own use. Calculations happen automatically on a regular schedule.</p>
        <p><strong>Currency:</strong> You can choose which currency to see (like USD or EUR). LEDGER does not perform actual currency exchange or trading.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>4. Security</h3>
        <p>You are responsible for keeping your account and cloud passwords safe. LEDGER uses secure passkey standards for all logins. Any attempts to hack or interfere with the service may result in your account being closed. <strong>Automated backups depend on the storage space and availability of your chosen cloud provider.</strong></p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>5. Limitation of Liability</h3>
        <p>We are not responsible for any financial losses or data errors that happen while using this platform.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>6. Governing Law</h3>
        <p>These terms are governed by the laws of the jurisdiction in which GameProductions operates. We reserve the right to modify these terms at any time.</p>
      </section>
      

    </div>
  )
}

export default TermsOfService
