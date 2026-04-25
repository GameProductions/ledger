import React from 'react'

const TermsOfService: React.FC = () => {
  return (
    <div className="card" style={{ maxWidth: '800px', margin: '4rem auto', padding: '3rem', lineHeight: '1.8', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem' }}>
      <button className="primary" onClick={() => window.location.hash = '#/'} style={{ marginBottom: '2rem' }}>← Back to Dashboard</button>
      <h1 style={{ marginBottom: '1rem', fontSize: '2.5rem' }}>Terms of Service</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Last Updated: March 28, 2026</p>
      
      <section style={{ marginBottom: '2rem' }}>
        <h3>1. Acceptance of Terms</h3>
        <p>By accessing or using the LEDGER platform (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>2. Description of Service</h3>
        <p>LEDGER is a financial management tool provided by GameProductions. We utilize a "Secure Data" model where your information is stored in encrypted edge databases (Cloudflare D1) and <strong>optionally synchronized with your personal cloud storage providers for redundancy and whole-household restoration.</strong></p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>3. Accuracy of Data</h3>
        <p>The "Safety Number", "Budget Rollover Engine", "Goal-Seek", and other financial metrics are estimates based on user-provided data. GameProductions is not a licensed financial advisor and provides this data for informational purposes only. Automated rollovers are based on system calculations at the end of each CRON cycle.</p>
        <p><strong>Universal Currency Engine:</strong> The display currency (USD, EUR, GBP) is a visual preference. LEDGER does not perform real-time FX trading or bank-level currency conversions. Accuracy is based on user inputs and platform-wide fallback settings.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>4. User Conduct & Security</h3>
        <p>You are responsible for maintaining the confidentiality of your session, tokens, and <strong>third-party cloud credentials.</strong> Unauthorized access attempts or interference with the API may lead to immediate account termination. <strong>You acknowledge that automated cloud backups depend on the available storage and uptime of your chosen providers.</strong></p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>5. Limitation of Liability</h3>
        <p>GameProductions shall not be liable for any financial losses, data inaccuracies, or damages resulting from the use of this edge-computing platform.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3>6. Governing Law</h3>
        <p>These terms are governed by the laws of the jurisdiction in which GameProductions operates. We reserve the right to modify these terms at any time.</p>
      </section>
      

    </div>
  )
}

export default TermsOfService
