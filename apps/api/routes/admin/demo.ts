import { Hono } from 'hono'
import { Bindings, Variables } from '../../types'
import { getDb } from '#/index'
import { users, households, userHouseholds, accounts, categories, transactions } from '#/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '../../auth-utils'

const demo = new Hono<{ Bindings: Bindings, Variables: Variables }>()

async function seedSandbox(db: any) {
  const demoHouseholdId = 'demo-household-001'
  const demoUserId = 'demo-user-001'
  const demoAccountId = 'demo-account-001'
  const demoPassword = 'Demo123!'

  // Clean existing demo data first to ensure clean state
  await db.delete(transactions).where(eq(transactions.householdId, demoHouseholdId))
  await db.delete(categories).where(eq(categories.householdId, demoHouseholdId))
  await db.delete(accounts).where(eq(accounts.householdId, demoHouseholdId))
  await db.delete(userHouseholds).where(eq(userHouseholds.householdId, demoHouseholdId))
  await db.delete(users).where(eq(users.id, demoUserId))
  await db.delete(households).where(eq(households.id, demoHouseholdId))

  // Seed household
  await db.insert(households).values({
    id: demoHouseholdId,
    name: 'Demo Sandbox',
    currency: 'USD',
    countryCode: 'US',
    unallocatedBalanceCents: 500000,
    status: 'active'
  })

  // Seed user
  const passwordHash = await hashPassword(demoPassword)
  await db.insert(users).values({
    id: demoUserId,
    username: 'demo',
    email: 'demo@ledger.local',
    displayName: 'Demo User',
    globalRole: 'demo',
    status: 'active',
    passwordHash,
    onboardingCompleted: true,
    timezone: 'UTC',
    locale: 'en-US',
    theme: 'system'
  })

  await db.insert(userHouseholds).values({
    userId: demoUserId,
    householdId: demoHouseholdId,
    role: 'member'
  })

  await db.insert(accounts).values({
    id: demoAccountId,
    householdId: demoHouseholdId,
    name: 'Demo Checking',
    type: 'checking',
    balanceCents: 1250000,
    currency: 'USD',
    status: 'active'
  })

  const categoryData = [
    { id: 'demo-cat-income', name: 'Income', icon: '💰', monthlyBudgetCents: 0, envelopeBalanceCents: 0, rolloverEnabled: false },
    { id: 'demo-cat-housing', name: 'Housing', icon: '🏠', monthlyBudgetCents: 150000, envelopeBalanceCents: 0, rolloverEnabled: true },
    { id: 'demo-cat-food', name: 'Food & Dining', icon: '🍕', monthlyBudgetCents: 60000, envelopeBalanceCents: 0, rolloverEnabled: true },
    { id: 'demo-cat-transport', name: 'Transportation', icon: '🚗', monthlyBudgetCents: 40000, envelopeBalanceCents: 0, rolloverEnabled: true },
    { id: 'demo-cat-utilities', name: 'Utilities', icon: '⚡', monthlyBudgetCents: 30000, envelopeBalanceCents: 0, rolloverEnabled: true },
    { id: 'demo-cat-entertainment', name: 'Entertainment', icon: '🎬', monthlyBudgetCents: 20000, envelopeBalanceCents: 0, rolloverEnabled: true },
    { id: 'demo-cat-savings', name: 'Savings', icon: '🏦', monthlyBudgetCents: 100000, envelopeBalanceCents: 250000, rolloverEnabled: true },
    { id: 'demo-cat-emergency', name: 'Emergency Fund', icon: '🛡️', monthlyBudgetCents: 50000, envelopeBalanceCents: 100000, rolloverEnabled: true },
  ]

  for (const cat of categoryData) {
    await db.insert(categories).values({ ...cat, householdId: demoHouseholdId, color: null, emergencyFund: false, rolloverCents: 0 })
  }

  const today = new Date()
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString().split('T')[0]

  const txData = [
    { description: 'Direct Deposit - Salary', amountCents: 350000, transactionDate: daysAgo(2), categoryId: 'demo-cat-income', status: 'cleared' },
    { description: 'Rent Payment', amountCents: -140000, transactionDate: daysAgo(3), categoryId: 'demo-cat-housing', status: 'cleared' },
    { description: 'Grocery Store', amountCents: -8560, transactionDate: daysAgo(1), categoryId: 'demo-cat-food', status: 'cleared' },
    { description: 'Gas Station', amountCents: -4500, transactionDate: daysAgo(1), categoryId: 'demo-cat-transport', status: 'cleared' },
    { description: 'Electric Bill', amountCents: -12300, transactionDate: daysAgo(5), categoryId: 'demo-cat-utilities', status: 'cleared' },
    { description: 'Netflix Subscription', amountCents: -1599, transactionDate: daysAgo(7), categoryId: 'demo-cat-entertainment', status: 'cleared' },
    { description: 'Internet Service', amountCents: -7999, transactionDate: daysAgo(10), categoryId: 'demo-cat-utilities', status: 'cleared' },
    { description: 'Restaurant - Dinner', amountCents: -4500, transactionDate: daysAgo(4), categoryId: 'demo-cat-food', status: 'cleared' },
    { description: 'Freelance Payment', amountCents: 50000, transactionDate: daysAgo(6), categoryId: 'demo-cat-income', status: 'cleared' },
    { description: 'Phone Bill', amountCents: -8500, transactionDate: daysAgo(8), categoryId: 'demo-cat-utilities', status: 'cleared' },
    { description: 'Transfer to Savings', amountCents: -25000, transactionDate: daysAgo(3), categoryId: 'demo-cat-savings', status: 'cleared' },
    { description: 'Coffee Shop', amountCents: -575, transactionDate: today.toISOString().split('T')[0], categoryId: 'demo-cat-food', status: 'pending' },
  ]

  for (const tx of txData) {
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      householdId: demoHouseholdId,
      accountId: demoAccountId,
      categoryId: tx.categoryId,
      amountCents: tx.amountCents,
      description: tx.description,
      transactionDate: tx.transactionDate,
      status: tx.status,
      ownerId: demoUserId,
      source: 'manual'
    })
  }

  return {
    success: true,
    message: 'Demo sandbox initialized successfully',
    credentials: {
      username: 'demo',
      password: demoPassword,
      householdId: demoHouseholdId
    }
  }
}

demo.post('/seed', async (c) => {
  const db = getDb(c.env)
  const demoHouseholdId = 'demo-household-001'
  const existing = await db.select({ id: households.id }).from(households).where(eq(households.id, demoHouseholdId)).limit(1)
  if (existing.length > 0) {
    return c.json({ 
      success: true, 
      message: 'Demo data already exists.', 
      credentials: { username: 'demo', password: 'Demo123!' } 
    })
  }

  const result = await seedSandbox(db)
  return c.json(result)
})

demo.post('/reset', async (c) => {
  const db = getDb(c.env)
  const result = await seedSandbox(db)
  return c.json({
    ...result,
    message: 'Demo sandbox environment reset to default values successfully.'
  })
})

export default demo
