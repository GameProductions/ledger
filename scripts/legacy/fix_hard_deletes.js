const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/api/routes/pcc.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldHouseholdDelete = `pcc.delete('/households/:id', async (c) => {
  const { id } = c.req.param()
  const db = getDb(c.env)
  await db.batch([
    db.delete(households).where(eq(households.id, id)),
    db.delete(userHouseholds).where(eq(userHouseholds.householdId, id))
  ])
  await logAudit(c, 'households', id, 'ADMIN_PURGE')
  return c.json({ success: true })
})`;

const newHouseholdDelete = `pcc.delete('/households/:id', async (c) => {
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

content = content.replace(oldHouseholdDelete, newHouseholdDelete);

const oldProviderDelete = `pcc.delete('/providers/:id', async (c) => {
  const { id } = c.req.param()
  const db = getDb(c.env)
  await db.delete(serviceProviders).where(eq(serviceProviders.id, id))
  await logAudit(c, 'service_providers', id, 'ADMIN_PURGE')
  return c.json({ success: true })
})`;

const newProviderDelete = `pcc.delete('/providers/:id', async (c) => {
  const { id } = c.req.param()
  const db = getDb(c.env)
  await db.batch([
    db.delete(linkedProviders).where(eq(linkedProviders.serviceProviderId, id)),
    db.delete(serviceProviders).where(eq(serviceProviders.id, id))
  ])
  await logAudit(c, 'service_providers', id, 'ADMIN_PURGE')
  return c.json({ success: true })
})`;

content = content.replace(oldProviderDelete, newProviderDelete);

fs.writeFileSync(filePath, content);
console.log('Fixed Hard Deletes in pcc.ts');
