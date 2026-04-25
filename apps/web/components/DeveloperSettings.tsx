import React, { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { getApiUrl } from '../utils/api'

const DeveloperSettings: React.FC = () => {
  const { token, householdId } = useAuth()
  const { showToast, showPrompt, showConfirm } = useToast()
  const { data: tokens = [], mutate: mutateTokens } = useApi('/api/data/tools/tokens')
  const { data: webhooksList, mutate: mutateWebhooks } = useApi('/api/interop/developer/webhooks')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [scheduleData, setScheduleData] = useState({ frequency: 'weekly' })

  const createToken = async () => {
    const name = await showPrompt('Name for this token?')
    if (!name) return
    const apiUrl = getApiUrl()
    const res = await fetch(`${apiUrl}/api/data/tools/tokens`, {
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
    
    const apiUrl = getApiUrl()
    await fetch(`${apiUrl}/api/data/tools/tokens/${id}`, {
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
    const confirmed = await showConfirm('Are you sure you want to delete this token? It will stop working immediately.', 'Delete Token')
    if (!confirmed) return
    
    const apiUrl = getApiUrl()
    await fetch(`${apiUrl}/api/data/tools/tokens/${id}`, {
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
    const apiUrl = getApiUrl()
    await fetch(`${apiUrl}/api/interop/developer/webhooks`, {
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
    mutateWebhooks()
  }

  const deleteWebhook = async (id: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this webhook?', 'Delete Webhook')
    if (!confirmed) return
    const apiUrl = getApiUrl()
    await fetch(`${apiUrl}/api/interop/developer/webhooks/${id}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      }
    })
    mutateWebhooks()
    showToast('Webhook deleted', 'success')
  }

  const exportData = async () => {
    const apiUrl = getApiUrl()
    try {
      const res = await fetch(`${apiUrl}/api/backup/export`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-household-id': householdId || '' }
      })
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ledger_backup_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      showToast('Export successful', 'success')
    } catch (err) {
      showToast('Export failed', 'error')
    }
  }

  const handleRestore = async () => {
    if (!restoreFile) return
    const confirmed = await showConfirm('WARNING: This will replace current records with matching IDs. Continue?', 'Data Restoration')
    if (!confirmed) return

    try {
      const text = await restoreFile.text()
      const body = JSON.parse(text)
      
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/api/backup/restore`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify(body)
      })
      
      if (res.ok) {
        showToast('System Restored Successfully', 'success')
        setRestoreFile(null)
      } else {
        throw new Error('Restore failed')
      }
    } catch (err) {
      showToast('Failed to restore data', 'error')
    }
  }

  const createBackupSchedule = async () => {
    const apiUrl = getApiUrl()
    try {
      await fetch(`${apiUrl}/api/planning/schedules`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({
          target_id: 'system_backup',
          target_type: 'backup',
          frequency: scheduleData.frequency,
          next_run_at: new Date().toISOString()
        })
      })
      showToast('Backup scheduled', 'success')
    } catch (err) {
      showToast('Failed to schedule backup', 'error')
    }
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
          <ul style={{ listStyle: 'none', marginTop: '1rem', padding: 0 }}>
            {webhooksList?.map((w: any) => (
              <li key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.6rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div className="truncate" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{w.url}</div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>Events: {w.event_list}</div>
                </div>
                <button 
                  onClick={() => deleteWebhook(w.id)}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: 'var(--red-500)', opacity: 0.6 }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ marginTop: '3rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
        <h4 style={{ marginBottom: '1.5rem' }}>📦 Data Migration & Safety</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div className="p-4 bg-white/5 rounded-2xl border border-glass-border">
            <h5 className="text-secondary uppercase tracking-widest text-[10px] mb-3">Backup Engine</h5>
            <p className="text-xs opacity-60 mb-4">Export your entire transaction history as a portable JSON file.</p>
            <button onClick={exportData} className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 font-bold py-3 transition-all">Download .JSON Export</button>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-glass-border">
            <h5 className="text-secondary uppercase tracking-widest text-[10px] mb-3">Data Import</h5>
            <p className="text-xs opacity-60 mb-4">Import a file to restore records. <span className="text-red-400 font-bold">Overwrites existing IDs.</span></p>
            <div className="flex gap-2">
              <input 
                type="file" 
                accept=".json"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                className="hidden" 
                id="restore-upload"
              />
              <label htmlFor="restore-upload" className="flex-1 p-3 bg-white/10 hover:bg-white/20 border border-glass-border rounded-xl cursor-pointer text-center text-xs transition-all">
                {restoreFile ? restoreFile.name : 'Choose Backup File'}
              </label>
              <button disabled={!restoreFile} onClick={handleRestore} className="p-3 bg-red-500/20 text-red-400 border border-red-500/40 font-bold disabled:opacity-40">Restore</button>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-glass-border">
            <h5 className="text-secondary uppercase tracking-widest text-[10px] mb-3">Cloud Backups</h5>
            <p className="text-xs opacity-60 mb-4">Configure automated backups to secure cloud providers.</p>
            <div className="flex gap-2">
              <select 
                value={scheduleData.frequency}
                onChange={(e) => setScheduleData({ frequency: e.target.value })}
                className="flex-1 bg-black/40 border border-glass-border rounded-xl p-3 text-xs outline-none focus:border-primary"
              >
                <option value="daily">Daily Backups</option>
                <option value="weekly">Weekly Backups</option>
                <option value="monthly">Monthly Backups</option>
              </select>
              <button onClick={createBackupSchedule} className="p-3 bg-white/10 hover:bg-white/20 border border-glass-border rounded-xl text-xs transition-all">Enable</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DeveloperSettings
