import React from 'react'

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="card" style={{ maxWidth: '800px', margin: '2rem auto', lineHeight: '1.6' }}>
      <button className="primary" onClick={() => window.history.back()} style={{ marginBottom: '2rem' }}>← Back</button>
      <h1 style={{ marginBottom: '2rem' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Effective Date: March 22, 2026</p>
      
      <h3>1. Data Sovereignty</h3>
      <p style={{ marginBottom: '1.5rem' }}>
        CASH is designed with data sovereignty at its core. We do not sell your financial data. 
        Your data is stored in localized, encrypted Cloudflare D1 databases and is only accessible via your authenticated household session.
      </p>

      <h3>2. Information We Collect</h3>
      <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
        <li>Account metadata (names, currency preferences)</li>
        <li>Financial transaction records (provided by you or imported)</li>
        <li>Authentication tokens (JWTs) for session management</li>
      </ul>

      <h3>3. External Integrations</h3>
      <p style={{ marginBottom: '1.5rem' }}>
        If you enable the Discord Bot integration, interaction metadata is processed to provide real-time responses. 
        Detailed financial records are never stored on Discord's servers.
      </p>

      <h3>4. Your Rights</h3>
      <p>
        You have the right to export your entire data set via the "Sovereign Export" feature in the dashboard at any time. 
        Deleting your household will permanently purge all associated records from our edge nodes.
      </p>
    </div>
  )
}

export default PrivacyPolicy
