import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const ImportWizard: React.FC = () => {
  const { token, householdId } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    
    // In a real app, we'd parse this or send to a specialized endpoint
    // We simulate the upload to a new /api/financials/transactions/import/csv endpoint
    const formData = new FormData()
    formData.append('csv', file)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/financials/transactions/import/csv`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: formData
      })
      const data = await res.json()
      setStatus(`Success: Imported ${data.count} items!`)
    } catch (e) {
      setStatus('Import failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="card" style={{ gridColumn: 'span 2' }}>
      <h3>Data Ingestion Wizard</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
        Upload a bank CSV to bulk-populate your cash.
      </p>
      
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input 
          type="file" 
          accept=".csv" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px dashed var(--glass-border)', color: 'white' }}
        />
        <button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="primary"
        >
          {uploading ? 'Processing...' : 'Start Ingestion'}
        </button>
      </div>
      
      {status && (
        <div style={{ marginTop: '1rem', color: status.includes('Success') ? 'var(--primary)' : 'var(--secondary)', fontSize: '0.85rem' }}>
          {status}
        </div>
      )}
    </section>
  )
}

export default ImportWizard
