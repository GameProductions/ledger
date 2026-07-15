import React from 'react'
import { Modal } from './ui/Modal'
import { EntityManagerSelect } from './ui/EntityManagerSelect'
import { Price } from './Price'
import { Calendar, Send, CreditCard, Tag, FileText } from 'lucide-react'

interface LedgerDetails {
  accountId: string
  categoryId: string
  transactionDate: string
  status: string
  chargeDescriptorId?: string
}

interface PromoteToLedgerModalProps {
  isOpen: boolean
  onClose: () => void
  singlePromoteId: string | null
  selectedIds: string[]
  tracked: any[]
  ledgerDetails: LedgerDetails
  setLedgerDetails: (d: LedgerDetails | ((prev: LedgerDetails) => LedgerDetails)) => void
  handleCreateAccount: (name: string) => Promise<string>
  handleCreateCategory: (name: string) => Promise<string>
  handleCreateChargeDescriptor: (name: string) => Promise<string>
  handleMoveToLedger: () => Promise<void>
}

export const PromoteToLedgerModal: React.FC<PromoteToLedgerModalProps> = ({
  isOpen,
  onClose,
  singlePromoteId,
  selectedIds,
  tracked,
  ledgerDetails,
  setLedgerDetails,
  handleCreateAccount,
  handleCreateCategory,
  handleCreateChargeDescriptor,
  handleMoveToLedger,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Main Ledger">
      <div className="space-y-6 p-1">
        {(() => {
          const promoItem = singlePromoteId
            ? tracked.find((t: any) => t.id === singlePromoteId)
            : null
          return promoItem ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{promoItem.description}</p>
                <p className="text-[10px] text-secondary font-medium mt-0.5">Pending tracked expense</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <Price amountCents={promoItem.amountCents} className="text-lg font-black text-orange-300" />
              </div>
            </div>
          ) : (
            <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4">
              <p className="text-sm text-orange-200/80 font-medium">
                Moving {selectedIds.length} items to the transaction ledger.
              </p>
            </div>
          )
        })()}

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-xs font-black tracking-widest text-secondary mb-1 flex items-center gap-1.5">
              <FileText size={14} className="text-orange-500" /> Charge Descriptor
            </label>
            <p className="text-[10px] text-slate-500 font-bold mb-2">
              Optional — label this charge to standardize descriptions across the ledger.
            </p>
            <EntityManagerSelect
              entityType="charge-descriptors"
              value={ledgerDetails.chargeDescriptorId || ''}
              onChange={(id) => {
                setLedgerDetails({ ...ledgerDetails, chargeDescriptorId: id || '' })
              }}
              placeholder="Select or create descriptor..."
              onCreate={handleCreateChargeDescriptor}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black tracking-widest text-secondary mb-1 flex items-center gap-1.5">
              <CreditCard size={14} className="text-orange-500" /> Payment Account
            </label>
            <p className="text-[10px] text-slate-500 font-bold mb-2">
              The account used for payment. Type a name to create a new one.
            </p>
            <EntityManagerSelect
              entityType="accounts"
              value={ledgerDetails.accountId}
              onChange={(val) => setLedgerDetails({ ...ledgerDetails, accountId: val })}
              placeholder="Choose or create Account..."
              onCreate={handleCreateAccount}
            />
          </div>
          <div>
            <label className="text-xs font-black tracking-widest text-secondary mb-1 flex items-center gap-1.5">
              <Tag size={14} className="text-orange-500" /> Budget Category
            </label>
            <p className="text-[10px] text-slate-500 font-bold mb-2">
              Category for expense reports. Type a name to create a new one.
            </p>
            <EntityManagerSelect
              entityType="categories"
              value={ledgerDetails.categoryId}
              onChange={(val) => setLedgerDetails({ ...ledgerDetails, categoryId: val })}
              placeholder="Choose or create Category..."
              onCreate={handleCreateCategory}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black tracking-widest text-secondary mb-1 flex items-center gap-1.5">
              <Calendar size={14} className="text-orange-500" /> Transaction Date
            </label>
            <p className="text-[10px] text-slate-500 font-bold mb-2">
              The date the transaction cleared or occurred.
            </p>
            <input
              type="date"
              value={ledgerDetails.transactionDate}
              onChange={(e) =>
                setLedgerDetails({ ...ledgerDetails, transactionDate: e.target.value })
              }
              className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-orange-500/50 outline-none font-bold"
            />
          </div>
          <div>
            <label className="text-xs font-black tracking-widest text-secondary mb-1 flex items-center gap-1.5">
              Reconciliation Status
            </label>
            <p className="text-[10px] text-slate-500 font-bold mb-2">
              Set whether this transaction has settled in your account.
            </p>
            <div className="flex gap-2">
              {[
                { value: 'paid', label: 'Paid / Cleared' },
                { value: 'pending', label: 'Pending / Uncleared' },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setLedgerDetails({ ...ledgerDetails, status: s.value })}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all border ${
                    ledgerDetails.status === s.value
                      ? 'bg-orange-500 border-orange-400 text-white'
                      : 'bg-black/40 border-white/10 text-secondary'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleMoveToLedger}
          disabled={!ledgerDetails.accountId}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2"
        >
          <Send size={18} />
          Move to Ledger
        </button>
      </div>
    </Modal>
  )
}
