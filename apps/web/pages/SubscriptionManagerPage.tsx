import React from 'react'
import SubscriptionManager from '../components/SubscriptionManager'
import { MainLayout } from '../components/layout/MainLayout'

const SubscriptionManagerPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          </div>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter">
              Subscription <span className="text-primary">Manager</span>
            </h1>
            <p className="text-xs text-secondary font-bold tracking-widest mt-0.5">Manage all your recurring services in one place</p>
          </div>
        </div>
        <SubscriptionManager />
      </div>
    </MainLayout>
  )
}

export default SubscriptionManagerPage
