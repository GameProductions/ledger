import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { households } from './financials';

export const personalLoans = sqliteTable('personalLoans', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  lender: text('lender'),
  totalPrincipalCents: integer('totalPrincipalCents').notNull(),
  remainingPrincipalCents: integer('remainingPrincipalCents').notNull(),
  interestRateApy: integer('interestRateApy'),
  startDate: text('startDate').notNull(),
  endDate: text('endDate'),
  status: text('status').default('active'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_loans_household').on(table.householdId),
}));

export const loanPayments = sqliteTable('loanPayments', {
  id: text('id').primaryKey(),
  loanId: text('loanId').notNull().references(() => personalLoans.id, { onDelete: 'cascade' }),
  amountCents: integer('amountCents').notNull(),
  paymentDate: text('paymentDate').notNull(),
  principalCents: integer('principalCents').notNull(),
  interestCents: integer('interestCents').notNull(),
  feesCents: integer('feesCents').default(0),
  transactionId: text('transactionId'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  loanIdx: index('idx_loan_payments_loan').on(table.loanId),
}));
