import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { households } from './financials';

export const personalLoans = sqliteTable('personal_loans', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  lenderUserId: text('lender_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  borrowerName: text('borrower_name').notNull(),
  borrowerContact: text('borrower_contact'),
  totalAmountCents: integer('total_amount_cents').notNull(),
  remainingBalanceCents: integer('remaining_balance_cents').notNull(),
  interestRateApy: integer('interest_rate_apy').default(0),
  termMonths: integer('term_months'),
  originationDate: text('origination_date').notNull(),
}, (table) => ({
  householdIdx: index('idx_personal_loans_household').on(table.householdId),
  lenderIdx: index('idx_personal_loans_lender').on(table.lenderUserId),
}));

export const loanPayments = sqliteTable('loan_payments', {
  id: text('id').primaryKey(),
  loanId: text('loan_id').notNull().references(() => personalLoans.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  paymentDate: text('payment_date').default(sql`CURRENT_TIMESTAMP`),
  platform: text('platform'),
  externalId: text('external_id'),
  method: text('method'),
  notes: text('notes'),
  status: text('status').default('completed'),
}, (table) => ({
  loanIdx: index('idx_loan_payments_loan').on(table.loanId),
}));
