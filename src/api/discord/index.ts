import { Hono } from 'hono'
import { InteractionType, InteractionResponseType, verifyKey } from 'discord-interactions'
import { Bindings, Variables } from '../types'
import { getLegacyExternalChartUrl } from '../services/chart-service'
import { getDb } from '../db'
import { accounts, subscriptions, categories, auditLogs } from '../db/schema'
import { eq, lte, and, desc } from 'drizzle-orm'

const discord = new Hono<{ Bindings: Bindings, Variables: Variables }>()

discord.post('/interactions', async (c) => {
  const signature = c.req.header('X-Signature-Ed25519')
  const timestamp = c.req.header('X-Signature-Timestamp')
  const body = await c.req.text()
  
  if (!c.env.DISCORD_PUBLIC_KEY) {
    console.error('[Discord] DISCORD_PUBLIC_KEY is missing')
    return c.text('Internal configuration error', 500)
  }

  const isValidRequest = await verifyKey(body, signature || '', timestamp || '', c.env.DISCORD_PUBLIC_KEY)
  if (!isValidRequest) return c.text('Bad request signature', 401)

  const interaction = JSON.parse(body)
  if (interaction.type === InteractionType.PING) {
    return c.json({ type: InteractionResponseType.PONG })
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data
    const householdId = 'ledger-main-001' 
    const db = getDb(c.env)
    
    if (name === 'ledger-safety') {
      const dbAccounts = await db.select({ balanceCents: accounts.balanceCents }).from(accounts).where(eq(accounts.householdId, householdId));
      const totalBalance = dbAccounts.reduce((sum, a) => sum + (a.balanceCents || 0), 0)
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: `🛡️ **LEDGER Safety Number**: Your current total balance is **$${(totalBalance / 100).toFixed(2)}**. Drive safe!` }
      })
    }

    if (name === 'ledger-upcoming') {
      const endDateStr = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
      const subs = await db.select({
        name: subscriptions.name,
        amountCents: subscriptions.amountCents,
        nextBillingDate: subscriptions.nextBillingDate
      }).from(subscriptions).where(and(eq(subscriptions.householdId, householdId), lte(subscriptions.nextBillingDate, endDateStr)));
      
      let content = "📅 **Upcoming Bills (7 Days)**:\n"
      if (subs.length === 0) content += "No bills due soon. You're all clear!"
      else subs.forEach(s => { content += `- ${s.name}: **$${((s.amountCents || 0)/100).toFixed(2)}** on ${s.nextBillingDate}\n` })

      return c.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content } })
    }

    if (name === 'ledger-forecast' || name === 'ledger-report') {
      const cats = await db.select({
        name: categories.name,
        envelopeBalanceCents: categories.envelopeBalanceCents
      }).from(categories).where(eq(categories.householdId, householdId)).limit(5);
      
      const totalInCats = cats.reduce((sum, cat) => sum + (cat.envelopeBalanceCents || 0), 0)
      const labels = cats.map(cat => cat.name)
      
      // FORENSIC PRIVACY: Send percentages to 3rd party instead of raw currency amounts
      const data = cats.map(cat => {
        if (totalInCats === 0) return 0
        return Math.round(((cat.envelopeBalanceCents || 0) / totalInCats) * 100)
      })
      
      const chartUrl = getLegacyExternalChartUrl('pie', labels, data, 'Portfolio Weighting (%)')

      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { 
          content: "📈 **LEDGER Health Report**: Here is your current portfolio weighting across core categories.",
          embeds: [{
            title: "Portfolio Allocation (%)",
            image: { url: chartUrl },
            color: 0x6366f1
          }]
        }
      })
    }


    if (name === 'ledger-audit') {
      const results = await db.select({
        action: auditLogs.action,
        tableName: auditLogs.tableName,
        createdAt: auditLogs.createdAt
      }).from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(5);
      
      let content = "🔍 **Latest Audit Logs**:\n"
      results.forEach(r => { content += `- ${r.createdAt}: **${r.action}** on \`${r.tableName}\`\n` })
      return c.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content } })
    }
  }

  return c.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: "Unknown LEDGER command received." } })
})

export default discord
