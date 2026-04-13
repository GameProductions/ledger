const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/api/routes/pcc.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Also update imports
content = content.replace(
  "userPaymentMethods, sharedBalances, systemAnnouncements } from '../db/schema'",
  "userPaymentMethods, sharedBalances, systemAnnouncements, auditLogs, paySchedules, householdInvites, accounts, linkedProviders } from '../db/schema'"
);

const oldHouseholdDelete = `pcc.delete('/households/:id', async (c) => {
  const { id } = c.req.param()
  const db = getDb(c.env)
  // Hard delete cascading backwards through all Foreign Key constraints
  await db.batch([
    db.delete(auditLogs).where(eq(auditLogs.householdId, id)),
    db.delete(transactions).where(eq(transactions.householdId, id)),
    db.delete(transactionLinks).where(inArray(transactionLinks.transactionId, db.select({ id: transactions.id }).from(transactions).where(eq(transactions.householdId, id)))),
    db.delete(paySchedules).where(eq(paySchedules.householdId, id)),
    db.delete(subscriptions).where(eq(subscriptions.householdId, id)),
    db.delete(serviceProviders).where(eq(serviceProviders.householdId, id)),
    db.delete(householdInvites).where(eq(householdInvites.householdId, id)),
    db.delete(userHouseholds).where(eq(userHouseholds.householdId, id)),
    db.delete(accounts).where(eq(accounts.householdId, id)),
    db.delete(budgets).where(eq(budgets.householdId, id)),
    db.delete(households).where(eq(households.id, id))
  ])
  return c.json({ success: true })
})`;

const newHouseholdDelete = `pcc.delete('/households/:id', async (c) => {
  const { id } = c.req.param()
  const db = getDb(c.env)
  // Hard delete cascading backwards slowly...
  await db.batch([
    db.delete(auditLogs).where(eq(auditLogs.householdId, id)),
    db.delete(transactions).where(eq(transactions.householdId, id)),
    db.delete(paySchedules).where(eq(paySchedules.householdId, id)),
    db.delete(subscriptions).where(eq(subscriptions.householdId, id)),
    db.delete(serviceProviders).where(eq(serviceProviders.householdId, id)),
    db.delete(householdInvites).where(eq(householdInvites.householdId, id)),
    db.delete(userHouseholds).where(eq(userHouseholds.householdId, id)),
    db.delete(accounts).where(eq(accounts.householdId, id)),
    db.delete(households).where(eq(households.id, id))
  ])
  return c.json({ success: true })
})`;

content = content.replace(oldHouseholdDelete, newHouseholdDelete);

// Remove the import mismatch for auditLogs as pccAuditLogs
content = content.replace(
  "auditLogs as pccAuditLogs, pccAuditLogs as systemPccAuditLogs",
  "pccAuditLogs as systemPccAuditLogs"
);


fs.writeFileSync(filePath, content);
console.log('Fixed Hard Deletes Imports!');
