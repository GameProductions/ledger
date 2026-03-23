import React from 'react'

const TermsOfService: React.FC = () => {
  return (
    <div className="card" style={{ maxWidth: '800px', margin: '2rem auto', lineHeight: '1.6' }}>
      <button className="primary" onClick={() => window.history.back()} style={{ marginBottom: '2rem' }}>← Back</button>
      <h1 style={{ marginBottom: '2rem' }}>Terms of Service</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Last Updated: March 22, 2026</p>
      
      <h3>1. Acceptance of Terms</h3>
      <p style={{ marginBottom: '1.5rem' }}>
        By accessing the CASH platform (the "Service"), you agree to be bound by these terms. 
        CASH is a financial management tool provided "as-is" for personal use.
      </p>

      <h3>2. Accuracy of Data</h3>
      <p style={{ marginBottom: '1.5rem' }}>
        While CASH provides predictive analytics and AI coaching, we are not licensed financial advisors. 
        The "Safety Number" and "Goal-Seek" metrics are derived from your provided data and should be used as general guidance only.
      </p>

      <h3>3. User Conduct</h3>
      <p style={{ marginBottom: '1.5rem' }}>
        You are responsible for maintaining the security of your authentication tokens and household IDs. 
        Unauthorized access attempts or interference with the API service may lead to account termination.
      </p>

      <h3>4. Limitation of Liability</h3>
      <p>
        GameProductions shall not be liable for any financial losses, data inaccuracies, or indirect damages resulting 
        from the use of this edge-computing platform.
      </p>
    </div>
  )
}

export default TermsOfService
