const fs = require('fs');
const path = require('path');

// 1. Households Transfer
const userPath = path.join(__dirname, '../ledger/src/api/routes/user.ts');
let userContent = fs.readFileSync(userPath, 'utf8');

const householdTransfer = `
user.patch('/households/:id/transfer', zValidator('json', z.object({ newOwnerId: z.string() })), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const { newOwnerId } = c.req.valid('json')
  const db = getDb(c.env)
  
  const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
  if (!membership || membership.role !== 'owner') return c.json({ error: 'Only the current owner can transfer household ownership' }, 403)
    
  // Validate target is a member
  const targetMember = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, newOwnerId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
  if (!targetMember) return c.json({ error: 'Target user is not a member of this household' }, 400)
    
  // Transaction equivalent
  await db.update(userHouseholds).set({ role: 'owner' }).where(and(eq(userHouseholds.userId, newOwnerId), eq(userHouseholds.householdId, id)))
  await db.update(userHouseholds).set({ role: 'admin' }).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id)))
  
  await logAudit(c, 'households', id, 'OWNERSHIP_TRANSFERRED', null, { from: userId, to: newOwnerId, context: 'household_core' })
  return c.json({ success: true })
})

user.patch('/providers/:id/transfer', zValidator('json', z.object({ newOwnerId: z.string() })), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const { newOwnerId } = c.req.valid('json')
  const db = getDb(c.env)
  
  const provider = await db.select().from(serviceProviders).where(eq(serviceProviders.id, id)).limit(1).then(res => res[0])
  if (!provider) return c.json({ error: 'Not found' }, 404)
    
  // Verify permissions (admin or current creator)
  if (provider.createdBy !== userId) {
     const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, provider.householdId))).limit(1).then(res => res[0])
     if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
  }
  
  await db.update(serviceProviders).set({ createdBy: newOwnerId }).where(eq(serviceProviders.id, id))
  await logAudit(c, 'service_providers', id, 'OWNERSHIP_TRANSFERRED', null, { from: provider.createdBy, to: newOwnerId })
  return c.json({ success: true })
})
`;

if (!userContent.includes('/households/:id/transfer')) {
  // Try to insert it before // Identites or end
  const splitPoint = userContent.indexOf('// Identities');
  if (splitPoint !== -1) {
    userContent = userContent.substring(0, splitPoint) + householdTransfer + '\n' + userContent.substring(splitPoint);
  } else {
    userContent += '\n' + householdTransfer;
  }
  fs.writeFileSync(userPath, userContent);
}

// 2. Financials Transfer (Transactions & Subscriptions)
const financialsPath = path.join(__dirname, '../ledger/src/api/routes/financials.ts');
if (fs.existsSync(financialsPath)) {
  let finContent = fs.readFileSync(financialsPath, 'utf8');
  
  const finTransfer = `
// Phase 4 Transfers
financials.patch('/subscriptions/:id/transfer', zValidator('json', z.object({ newOwnerId: z.string() })), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const { newOwnerId } = c.req.valid('json')
  const db = getDb(c.env)
  
  const sub = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1).then(res => res[0])
  if (!sub) return c.json({ error: 'Not found' }, 404)
    
  if (sub.ownerId !== userId) {
     const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, sub.householdId))).limit(1).then(res => res[0])
     if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
  }
  
  await db.update(subscriptions).set({ ownerId: newOwnerId }).where(eq(subscriptions.id, id))
  await logAudit(c, 'subscriptions', id, 'OWNERSHIP_TRANSFERRED', null, { from: sub.ownerId, to: newOwnerId })
  return c.json({ success: true })
})

financials.patch('/transactions/:id/transfer', zValidator('json', z.object({ newOwnerId: z.string() })), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const { newOwnerId } = c.req.valid('json')
  const db = getDb(c.env)
  
  const txn = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1).then(res => res[0])
  if (!txn) return c.json({ error: 'Not found' }, 404)
    
  if (txn.ownerId !== userId) {
     const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, txn.householdId))).limit(1).then(res => res[0])
     if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
  }
  
  await db.update(transactions).set({ ownerId: newOwnerId }).where(eq(transactions.id, id))
  await logAudit(c, 'transactions', id, 'OWNERSHIP_TRANSFERRED', null, { from: txn.ownerId, to: newOwnerId })
  return c.json({ success: true })
})
`;

  if (!finContent.includes('/subscriptions/:id/transfer')) {
    finContent += '\n' + finTransfer;
    fs.writeFileSync(financialsPath, finContent);
  }
}

console.log('Modified transfers');
