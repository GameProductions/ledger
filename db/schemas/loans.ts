import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { households } from './financials';

export const personalLoans = sqliteTable('personalLoans', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  lenderUserId: text('lenderUserId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  borrowerName: text('borrowerName').notNull(),
  borrowerContact: text('borrowerContact'),
  totalAmountCents: integer('totalAmountCents').notNull(),
  remainingBalanceCents: integer('remainingBalanceCents').notNull(),
  interestRateApy: integer('interestRateApy').default(0),
  termMonths: integer('termMonths'),
  originationDate: text('originationDate').notNull(),
}, (table) => ({
  householdIdx: index('idx_personal_loans_household').on(table.householdId),
  lenderIdx: index('idx_personal_loans_lender').on(table.lenderUserId),
}));

export const loanPayments = sqliteTable('loanPayments', {
  id: text('id').primaryKey(),
  loanId: text('loanId').notNull().references(() => personalLoans.id, { onDelete: 'cascade' }),
  amountCents: integer('amountCents').notNull(),
  paymentDate: text('paymentDate').notNull(),
  notes: text('notes'),
  status: text('status').default('completed'),
}, (table) => ({
  loanIdx: index('idx_loan_payments_loan').on(table.loanId),
}));
