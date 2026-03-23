import React from 'react'
import { useAuth } from '../context/AuthContext'

const PrivacySettings: React.FC = () => {
  const { token, householdId } = useAuth()

  const downloadFullExport = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/export/full`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      }
    })
    const data = await res.json()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cash-sovereign-export-${Date.now()}.json`
    a.click()
  }

  const shredOldData = async () => {
    if (!confirm('This will permanently delete transactions older than 12 months. Proceed?')) return
    await fetch(`${import.meta.env.VITE_API_URL}/api/privacy/shred`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ months: 12 })
    })
    alert('Shredding complete.')
  }

  return (
    <section className="card">
      <h3 style={{ marginBottom: '1.5rem' }}>🛡️ Data Sovereignty</h3>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Portable Export</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>Download your entire household data in standardized JSON format.</p>
          <button onClick={downloadFullExport} style={{ width: '100%', background: 'var(--bg-dark)' }}>📥 Download All (.json)</button>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '0.5rem 0' }} />
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Privacy Shredder</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>Permanently remove data older than 1 year to stay lightweight.</p>
          <button onClick={shredOldData} style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>🔥 Shred Old Data</button>
        </div>
      </div>
    </section>
  )
}

export default PrivacySettings
