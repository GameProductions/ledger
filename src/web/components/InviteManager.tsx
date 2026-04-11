import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const InviteManager: React.FC = () => {
  const { token, householdId } = useAuth()
  const [invited, setInvited] = useState(false)
  const [link, setLink] = useState('')

  const generateInvite = async () => {
    if (!token) return

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/households/invite`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      }
    })
    if (!res.ok) {
      const errorText = await res.text()
      console.error('[InviteManager] Generation failed:', errorText)
      return
    }

    const data = await res.json()
    const fullUrl = `${window.location.origin}/${data.url}`
    setLink(fullUrl)
    setInvited(true)
  }

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Partners & Sharing</h3>
        <button onClick={generateInvite} className="primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
          + Invite Partner
        </button>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
        Share this household with a partner or family member to track budgets together.
      </p>
      
      {invited && (
        <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'var(--bg-dark)', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>SEND THIS LINK:</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--primary)', wordBreak: 'break-all', fontWeight: 'bold' }}>{link}</div>
        </div>
      )}
    </section>
  )
}

export default InviteManager
