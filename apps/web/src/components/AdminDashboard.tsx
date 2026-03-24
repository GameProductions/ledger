import React, { useState } from 'react'
import { useApi } from '../hooks/useApi'

const AdminDashboard: React.FC = () => {
  const { data: users, loading: loadingUsers, mutate: mutateUsers } = useApi('/api/admin/users')
  const { data: connections, loading: loadingConn, mutate: mutateConn } = useApi('/api/admin/connections')
  const { data: audit, loading: loadingAudit, mutate: mutateAudit } = useApi('/api/admin/audit')
  const [activeTab, setActiveTab] = useState<'users' | 'connections' | 'audit'>('users')

  const handleUpdateUser = async (userId: string, updates: any) => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
      },
      body: JSON.stringify(updates)
    })
    mutateUsers()
    mutateAudit()
  }

  const handleUpdateConnection = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const data = {
      household_id: formData.get('household_id'),
      provider: formData.get('provider'),
      access_token: formData.get('access_token'),
      status: 'active'
    }

    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
      },
      body: JSON.stringify(data)
    })
    mutateConn()
    mutateAudit()
    ;(e.target as HTMLFormElement).reset()
  }

  return (
    <div className="admin-dashboard dashboard reveal" style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--secondary)' }}>Super Admin Console</h1>
        <button className="primary" onClick={() => window.location.hash = ''}>Back to Dashboard</button>
      </header>

      <div className="card reveal" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', animationDelay: '0.1s' }}>
        <button className={activeTab === 'users' ? 'primary' : ''} onClick={() => setActiveTab('users')}>User Management</button>
        <button className={activeTab === 'connections' ? 'primary' : ''} onClick={() => setActiveTab('connections')}>External Connections</button>
        <button className={activeTab === 'audit' ? 'primary' : ''} onClick={() => setActiveTab('audit')}>System Audit Logs</button>
      </div>

      <main className="stagger">
        {activeTab === 'users' && (
          <section className="card reveal">
            <h3>Registered Users</h3>
            {loadingUsers ? <p>Loading users...</p> : (
              <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.6 }}>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(users) && users.map((u: any) => (
                    <tr key={u.id} className="slide-up" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '1rem 0' }}>
                        <div style={{ fontWeight: '600' }}>{u.display_name || 'Anonymous'}</div>
                        <div style={{ fontSize: '0.8rem' }}>{u.email}</div>
                      </td>
                      <td>{u.global_role}</td>
                      <td>{u.status}</td>
                      <td>
                        <select 
                          style={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.2rem' }}
                          onChange={(e) => handleUpdateUser(u.id, { global_role: e.target.value, status: u.status })}
                          value={u.global_role}
                        >
                          <option value="user">User</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                        <button 
                          style={{ marginLeft: '0.5rem', background: u.status === 'suspended' ? 'var(--primary)' : 'rgba(239, 68, 68, 0.2)', color: u.status === 'suspended' ? 'white' : '#ef4444' }}
                          onClick={() => handleUpdateUser(u.id, { global_role: u.global_role, status: u.status === 'active' ? 'suspended' : 'active' })}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {activeTab === 'connections' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            <section className="card reveal">
              <h3>Active Connections</h3>
              {loadingConn ? <p>Loading connections...</p> : (
                <div style={{ marginTop: '1rem' }}>
                  {Array.isArray(connections) && connections.map((c: any) => (
                    <div key={c.id} className="slide-up" style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: '700' }}>{c.provider}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Household: {c.household_id}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--primary)' }}>{c.status}</div>
                        <div style={{ fontSize: '0.7rem' }}>Last Sync: {c.last_sync_at || 'Never'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            
            <section className="card reveal" style={{ animationDelay: '0.2s' }}>
              <h3>Secure Token Entry</h3>
              <form onSubmit={handleUpdateConnection} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <input name="household_id" placeholder="Household ID" required style={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', padding: '0.8rem', color: 'white', borderRadius: '0.5rem' }} />
                <select name="provider" required style={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', padding: '0.8rem', color: 'white', borderRadius: '0.5rem' }}>
                  <option value="plaid">Plaid</option>
                  <option value="method">Method FI</option>
                  <option value="arcadia">Arcadia (Utility)</option>
                  <option value="privacy">Privacy.com</option>
                  <option value="akoya">Akoya (401k)</option>
                </select>
                <input name="access_token" type="password" placeholder="API Access Token" required style={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', padding: '0.8rem', color: 'white', borderRadius: '0.5rem' }} />
                <button type="submit" className="primary" style={{ width: '100%' }}>Deploy Encrypted Token</button>
                <p style={{ fontSize: '0.7rem', opacity: 0.5, textAlign: 'center' }}>🔒 Token will be encrypted with AES-256 before storage.</p>
              </form>
            </section>
          </div>
        )}

        {activeTab === 'audit' && (
          <section className="card reveal">
            <h3>System Audit Chronicle</h3>
            {loadingAudit ? <p>Loading audit logs...</p> : (
              <div style={{ marginTop: '1rem' }}>
                {Array.isArray(audit) && audit.map((log: any) => (
                  <div key={log.id} className="slide-up" style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '700', color: 'var(--secondary)' }}>{log.action}</span>
                      <span style={{ opacity: 0.5 }}>{log.created_at}</span>
                    </div>
                    <div style={{ marginTop: '0.3rem' }}>
                      <span style={{ opacity: 0.7 }}>Target:</span> {log.target}
                    </div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.2rem' }}>
                      Actor: {log.user_id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard
