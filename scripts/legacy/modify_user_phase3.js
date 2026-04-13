const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/api/routes/user.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Ensure import includes 'ne' and 'isNull' if needed
if (!content.includes('ne,')) {
  content = content.replace(/eq, and, sql, desc, or, gt } from 'drizzle-orm'/, "eq, and, sql, desc, or, gt, ne, isNull } from 'drizzle-orm'");
}

// 1. Update GET /households to exclude archived households
content = content.replace(
  /eq\(userHouseholds\.userId, userId\)/g,
  "and(eq(userHouseholds.userId, userId), ne(households.status, 'archived'))"
);

// 2. Add Phase 3 Routes
const phase3Routes = `
// Phase 3: Household Management Expansions

user.get('/households/:id/members', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const db = getDb(c.env)
  
  // Verify membership
  const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
  if (!membership) return c.json({ error: 'Forbidden' }, 403)
    
  const members = await db.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    avatarUrl: users.avatarUrl,
    role: userHouseholds.role
  }).from(users).innerJoin(userHouseholds, eq(users.id, userHouseholds.userId)).where(eq(userHouseholds.householdId, id))
  
  return c.json(members)
})

user.get('/households/:id/invites', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const db = getDb(c.env)
  const results = await db.select().from(householdInvites).where(and(eq(householdInvites.householdId, id), eq(householdInvites.status, 'pending')))
  return c.json(results)
})

user.delete('/households/:id/invites/:inviteId', async (c) => {
  const userId = c.get('userId') as string
  const { id, inviteId } = c.req.param()
  const db = getDb(c.env)
  
  const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
  if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
    
  await db.delete(householdInvites).where(eq(householdInvites.id, inviteId))
  await logAudit(c, 'households', id, 'INVITE_REVOKED', null, { inviteId })
  return c.json({ success: true })
})

user.patch('/households/:id/members/:memberId', zValidator('json', z.object({ role: z.enum(['observer', 'member', 'admin', 'owner']) })), async (c) => {
  const userId = c.get('userId') as string
  const { id, memberId } = c.req.param()
  const { role } = c.req.valid('json')
  const db = getDb(c.env)
  
  const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
  if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
    
  await db.update(userHouseholds).set({ role }).where(and(eq(userHouseholds.userId, memberId), eq(userHouseholds.householdId, id)))
  await logAudit(c, 'households', id, 'MEMBER_ROLE_UPDATED', null, { memberId, role })
  return c.json({ success: true })
})

user.delete('/households/:id/members/:memberId', zValidator('json', z.object({ transferToUserId: z.string().optional() }).optional()), async (c) => {
  const userId = c.get('userId') as string
  const { id, memberId } = c.req.param()
  const db = getDb(c.env)
  
  // You can kick yourself (leave) or admins/owners can kick others
  if (userId !== memberId) {
    const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
  }
  
  // Ghost-Bill check
  const orphanedBills = await db.select().from(subscriptions).where(and(eq(subscriptions.householdId, id), eq(subscriptions.ownerId, memberId))).limit(1).then(res => res[0])
  
  if (orphanedBills) {
    const body = await c.req.json().catch(() => ({}))
    if (!body.transferToUserId) {
       return c.json({ error: 'Ghost-Bill Lock: User owns active bills.', requiresTransfer: true }, 400)
    } else {
       await db.update(subscriptions).set({ ownerId: body.transferToUserId }).where(and(eq(subscriptions.householdId, id), eq(subscriptions.ownerId, memberId)))
       await logAudit(c, 'households', id, 'OWNERSHIP_TRANSFERRED', null, { from: memberId, to: body.transferToUserId, type: 'subscriptions_batch' })
    }
  }

  await db.delete(userHouseholds).where(and(eq(userHouseholds.userId, memberId), eq(userHouseholds.householdId, id)))
  await logAudit(c, 'households', id, 'MEMBER_EJECTED', null, { memberId })
  return c.json({ success: true })
})

user.delete('/households/:id', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const db = getDb(c.env)
  
  const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
  if (!membership || membership.role !== 'owner') return c.json({ error: 'Only owners can archive households' }, 403)
    
  await db.update(households).set({ status: 'archived' }).where(eq(households.id, id))
  await logAudit(c, 'households', id, 'ARCHIVED', null, null)
  return c.json({ success: true })
})

user.post('/households/restore/:entityType/:entityId', async (c) => {
  const userId = c.get('userId') as string
  const { entityType, entityId } = c.req.param()
  const db = getDb(c.env)
  
  let targetTable;
  switch(entityType) {
    case 'households': targetTable = households; break;
    case 'accounts': targetTable = accounts; break;
    case 'providers': targetTable = serviceProviders; break;
    case 'payment_methods': targetTable = userPaymentMethods; break;
    default: return c.json({ error: 'Invalid entity' }, 400)
  }
  
  await db.update(targetTable).set({ status: 'active' }).where(eq(targetTable.id, entityId))
  await logAudit(c, entityType, entityId, 'RESTORED', null, null)
  return c.json({ success: true })
})
`;

if (!content.includes('/households/:id/members')) {
  // Try to insert it before // Identites
  const splitPoint = content.indexOf('// Identities');
  if (splitPoint !== -1) {
    content = content.substring(0, splitPoint) + phase3Routes + '\n' + content.substring(splitPoint);
  } else {
    content += '\n' + phase3Routes;
  }
}

fs.writeFileSync(filePath, content);
console.log('Modified user.ts with Phase 3 routes');
