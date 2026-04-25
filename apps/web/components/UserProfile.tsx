import React, { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { getApiUrl } from '../utils/api'

const UserProfile: React.FC = () => {
  const { data: profile } = useApi('/api/user/profile')
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (profile) setName(profile.display_name)
  }, [profile])

  const handleUpdate = async () => {
    await fetch(`${getApiUrl()}/api/user/profile`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
      },
      body: JSON.stringify({ display_name: name })
    })
    setEditing(false)
    window.location.reload()
  }

  if (!profile) return null

  return (
    <div className="user-profile-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      {editing ? (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            style={{ padding: '0.3rem', borderRadius: '0.4rem', background: 'var(--bg-dark)', border: '1px solid var(--primary)', color: 'white' }}
          />
          <button onClick={handleUpdate} className="primary" style={{ padding: '0.3rem 0.6rem' }}>Save</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }} onClick={() => setEditing(true)}>
          <img src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id}`} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--primary)' }} />
          <span style={{ fontWeight: 600 }}>{profile.display_name || 'Set Name'}</span>
        </div>
      )}
    </div>
  )
}

export default UserProfile
