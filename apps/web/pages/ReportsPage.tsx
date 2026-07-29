import React, { useState, useRef } from 'react'
import { BarChart3, TrendingUp, Wallet, DollarSign, GitCompare } from 'lucide-react'
import { MainLayout } from '../components/layout/MainLayout'
import { ReportFilterProvider } from '../components/reports/context/ReportFilterContext'
import { ReportFilters } from '../components/reports/filters/ReportFilters'
import { ExportMenu } from '../components/reports/export/ExportMenu'
import { OverviewTab } from '../components/reports/tabs/OverviewTab'
import { SpendingTab } from '../components/reports/tabs/SpendingTab'
import { BudgetTab } from '../components/reports/tabs/BudgetTab'
import { CashFlowTab } from '../components/reports/tabs/CashFlowTab'
import { CompareTab } from '../components/reports/tabs/CompareTab'
import { DrillDownModal } from '../components/reports/drilldown/DrillDownModal'
import { TabId, DrillDownPayload } from '../components/reports/types'

const TABS: { id: TabId; label: string; icon: React.FC<{ size?: number }> }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'spending', label: 'Spending', icon: TrendingUp },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'cashflow', label: 'Cash Flow', icon: DollarSign },
  { id: 'compare', label: 'Compare', icon: GitCompare },
]

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [drillDown, setDrillDown] = useState<DrillDownPayload | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />
      case 'spending': return <SpendingTab onDrillDown={(p) => setDrillDown({ ...p, from: undefined, to: undefined, type: 'expense' })} />
      case 'budget': return <BudgetTab />
      case 'cashflow': return <CashFlowTab />
      case 'compare': return <CompareTab />
    }
  }

  return (
    <ReportFilterProvider>
      <MainLayout>
        <div className="space-y-6 reveal" ref={reportRef}>
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tighter">Reports</h1>
              <p className="text-secondary font-medium opacity-60">Financial analytics and insights.</p>
            </div>
            <ExportMenu tabId={activeTab} reportRef={reportRef} />
          </header>

          <ReportFilters />

          {/* Tab Bar */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black tracking-widest rounded-lg transition-all ${activeTab === tab.id ? 'bg-primary text-black' : 'text-white/50 hover:text-white'}`}
                >
                  <Icon size={12} /> {tab.label}
                </button>
              )
            })}
          </div>

          {renderTab()}
        </div>

        {drillDown && (
          <DrillDownModal payload={drillDown} onClose={() => setDrillDown(null)} />
        )}
      </MainLayout>
    </ReportFilterProvider>
  )
}

export default ReportsPage
