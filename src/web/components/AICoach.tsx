import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../utils/api'

const AICoach: React.FC = () => {
  const { token, householdId } = useAuth()
  const [messages, setMessages] = useState<{ role: 'user' | 'coach', text: string }[]>([
    { role: 'coach', text: "Hello! I'm your LEDGER Coach. Ask me anything about your finances." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const askCoach = async () => {
    if (!input.trim()) return
    const question = input
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${getApiUrl()}/api/interop/coach/ask/ask`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({ question: question })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'coach', text: data.answer }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'coach', text: "Sorry, I'm having trouble connecting to the backend right now." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', height: '400px' }}>
      <h3 style={{ marginBottom: '1rem' }}>💬 AI Financial Coach</h3>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingRight: '0.5rem' }}>
        {messages?.map((m, i) => (
          <div key={i} style={{ 
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            background: m.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
            color: 'white',
            padding: '0.6rem 1rem',
            borderRadius: m.role === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
            fontSize: '0.9rem',
            maxWidth: '85%'
          }}>
            {m.text}
          </div>
        ))}
        {loading && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Coach is thinking...</div>}
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && askCoach()}
          placeholder="Ask a question..."
          style={{ flex: 1 }}
        />
        <button onClick={askCoach} className="primary" style={{ padding: '0.5rem 1rem' }}>Ask</button>
      </div>
    </section>
  )
}

export default AICoach
