import React, { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'

const DeveloperSettings: React.FC = () => {
  const { token, householdId } = useAuth()
  const { showToast, showPrompt } = useToast()
  const { data: tokens, mutate: mutateTokens } = useApi('/api/data/tools/tokens')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')

  const createToken = async () => {
    const name = await showPrompt('Name for this token?')
    if (!name) return
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/data/tools/tokens`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ name })
    })
    const data = await res.json()
    setNewToken(data.token)
    mutateTokens()
  }

  const renameToken = async (id: string, currentName: string) => {
    const newName = await showPrompt('New name for this token?', currentName)
    if (!newName || newName === currentName) return
    
    await fetch(`${import.meta.env.VITE_API_URL}/api/data/tools/tokens/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ name: newName })
    })
    mutateTokens()
    showToast('Token renamed', 'success')
  }

  const deleteToken = async (id: string) => {
    if (!confirm('Are you sure you want to delete this token? It will stop working immediately.')) return
    
    await fetch(`${import.meta.env.VITE_API_URL}/api/data/tools/tokens/${id}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      }
    })
    mutateTokens()
    showToast('Token deleted', 'success')
  }

  const addWebhook = async () => {
    if (!webhookUrl) return
    await fetch(`${import.meta.env.VITE_API_URL}/api/interop/developer/webhooks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ url: webhookUrl })
    })
    setWebhookUrl('')
    showToast('Webhook added!', 'success')
  }

  return (
    <section className="card" style={{ gridColumn: 'span 2' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>🛠️ Developer Tools</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h4>Personal Access Tokens</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Use these to access your data via scripts.</p>
          <ul style={{ listStyle: 'none', marginBottom: '1rem', padding: 0 }}>
            {tokens?.map((t: any) => (
              <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.6rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: 'var(--primary)' }}>{t.name}</strong>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>ID: {t.id.substring(0, 10)}...</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => renameToken(t.id, t.name)}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', opacity: 0.6 }}
                  >
                    Rename
                  </button>
                  <button 
                    onClick={() => deleteToken(t.id)}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: 'var(--red-500)', opacity: 0.6 }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {(!tokens || tokens.length === 0) && (
              <li style={{ padding: '1rem 0', textAlign: 'center', opacity: 0.4, fontSize: '0.8rem' }}>No tokens generated yet.</li>
            )}
          </ul>
          <button onClick={createToken} className="primary" style={{ width: '100%' }}>Generate New Token</button>
          {newToken && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed var(--primary)', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Copy this token (it won't be shown again):</div>
              <code style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{newToken}</code>
            </div>
          )}
        </div>

        <div>
          <h4>Outgoing Webhooks</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Notify external apps when transactions are created.</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-app.com/webhook"
              style={{ flex: 1, padding: '0.8rem', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'white' }}
            />
            <button onClick={addWebhook}>Add</button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DeveloperSettings
