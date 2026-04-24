import React, { useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { getApiUrl } from '../../utils/api'

const ClaimInvitePage: React.FC = () => {
  const { showToast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  
  const query = new URLSearchParams(window.location.search || window.location.hash.split('?')[1])
  const token = query.get('token')

  const handleClaim = async () => {
    if (!token) {
      showToast('Missing invitation token', 'error')
      return
    }
    setLoading(true)
    try {
      const apiUrl = getApiUrl().replace(/\/$/, '')
      const res = await fetch(`${apiUrl}/api/auth/admin/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username, password, email })
      })
      
      if (!res.ok) {
        const error = await res.json()
        showToast(`Claim Failed: ${error.error || 'Unknown error'}`, 'error')
        return
      }

      showToast('Invite claimed! You can now log in.', 'success')
      window.location.hash = '#/login'
    } catch (e) {
      showToast('Network error during claim.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return <div className="flex-center min-h-[80vh] font-bold uppercase tracking-widest text-secondary">Invalid Invitation</div>

  return (
    <div className="flex-center min-h-screen p-4">
      <div className="card w-full max-w-md p-8 reveal space-y-8 bg-[#0f172a]/80 backdrop-blur-2xl">
        <div className="text-center space-y-4">
          <img src="/assets/icon.png" alt="LEDGER Logo" className="h-16 mx-auto" />
          <div>
            <h2 className="text-2xl font-black tracking-tighter">Join as Admin</h2>
            <p className="text-xs text-secondary uppercase tracking-widest font-bold opacity-60">Create your super admin account</p>
          </div>
        </div>
        <form 
          className="space-y-6"
          onSubmit={(e) => { e.preventDefault(); handleClaim(); }}
        >
          <Input 
            label="Username"
            type="text" 
            placeholder="e.g. admin_prime" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input 
            label="Email Address"
            type="email" 
            placeholder="prime@gpnet.dev" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input 
            label="Choose Password"
            type="password" 
            placeholder="min 8 characters" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full"
            loading={loading}
          >
            Claim Invitation
          </Button>
        </form>
      </div>
    </div>
  )
}

export default ClaimInvitePage
