import React from 'react'
import { LoginDialog } from '@shared/auth/client/LoginDialog'

const LoginPage: React.FC = () => {
  return (
    <LoginDialog
      appName="Ledger"
      appLogo="/assets/icon-512.png"
      appDescription="Authenticate to access your private ledger"
      brandGradient="from-emerald-400 via-teal-300 to-cyan-400"
      providers={['discord', 'google']}
      onSuccess={() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('ledger_auth_sync'))
        }
        window.location.hash = '#/dashboard'
      }}
    />
  )
}

export default LoginPage
