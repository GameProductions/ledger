export interface AccountAllocation {
  bankName: string
  accountType: string
  amounts: Record<string, number>
}

export interface ExpenseItem {
  billName: string
  payee: string
  category: string | null
  balance: number | null
  averagePayment: number | null
  dueDate: string | null
  frequency: string | null
  autoManual: string | null
  paymentMethod: string | null
  paidBy: string | null
  amountCents: number
  notes: string | null
}

export interface PaycheckBlock {
  label: string
  dates: Record<string, string>
  income: Record<string, number>
  additionalIncome: Record<string, number> | null
  accountAllocations: AccountAllocation[]
  freeSpending: Record<string, number> | null
  expenses: ExpenseItem[]
}

export interface ParsedLedgerData {
  year: number
  persons: string[]
  netIncome: Record<string, number>
  totalExpenses: Record<string, number>
  paychecks: PaycheckBlock[]
}

export type MatchConfidence = 'exact' | 'high' | 'medium' | 'low' | null

export type EntityGroup = 'provider' | 'account' | 'category' | 'biller' | 'payment-method' | 'subscription' | 'person'

export interface MatchResult {
  entityId: string
  entityName: string
  confidence: MatchConfidence
}

export interface EntityMatchItem {
  id: string
  group: EntityGroup
  importedName: string
  existing: MatchResult | null
  status: 'pending' | 'approved' | 'rejected'
  manualMatch: MatchResult | null
  createNew: boolean
  newName: string
}

export interface EntityMatchGroup {
  group: EntityGroup
  label: string
  items: EntityMatchItem[]
}

export interface EntityInput {
  group: EntityGroup
  names: string[]
  context?: Record<string, { accountType?: string }>
}

export type ParsingMode = 'auto' | 'predefined' | 'custom' | 'template'

export interface ParsingSelection {
  mode: ParsingMode
  predefinedFormat?: string
  templateName?: string
}

export interface TemplateDefinition {
  columnMapping: Record<string, string>
  layoutMode: 'rows' | 'cells'
  fieldPatterns: Record<string, string>
  additionalFields: { fieldName: string; column: string; pattern: string }[]
}

export interface ImportCommitPayload {
  year: number
  personMap: Record<string, string>
  paychecks: {
    label: string
    monthDates: Record<string, string>
    income: Record<string, number>
    additionalIncome: Record<string, number> | null
    accountAllocations: { bankName: string; accountType: string; userId: string; amountCents: number }[]
    freeSpending: Record<string, number> | null
    expenses: {
      billName: string
      payee: string
      categoryId: string | null
      dueDate: string | null
      frequency: string | null
      ownerId: string
      amountCents: number
      notes: string | null
      isRecurring: boolean
      paycheckDate: string | null
    }[]
  }[]
}
