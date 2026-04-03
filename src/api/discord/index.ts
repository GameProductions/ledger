import { Hono } from 'hono'
import { InteractionType, InteractionResponseType, verifyKey } from 'discord-interactions'
import { Bindings, Variables } from '../types'
import { getQuickChartUrl } from '../services/chart-service'

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
    
    if (name === 'ledger-safety') {
      const { results: accounts } = await c.env.DB.prepare('SELECT balance_cents FROM accounts WHERE household_id = ?').bind(householdId).all()
      const totalBalance = (accounts as any[]).reduce((sum, a) => sum + a.balance_cents, 0)
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: `🛡️ **LEDGER Safety Number**: Your current total balance is **$${(totalBalance / 100).toFixed(2)}**. Drive safe!` }
      })
    }

    if (name === 'ledger-upcoming') {
      const endDateStr = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
      const { results: subs } = await c.env.DB.prepare('SELECT name, amount_cents, next_billing_date FROM subscriptions WHERE household_id = ? AND next_billing_date <= ?').bind(householdId, endDateStr).all()
      
      let content = "📅 **Upcoming Bills (7 Days)**:\n"
      if (subs.length === 0) content += "No bills due soon. You're all clear!"
      else (subs as any[]).forEach(s => { content += `- ${s.name}: **$${(s.amount_cents/100).toFixed(2)}** on ${s.next_billing_date}\n` })

      return c.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content } })
    }

    if (name === 'ledger-forecast' || name === 'ledger-report') {
      const { results: categories } = await c.env.DB.prepare(
        'SELECT name, envelope_balance_cents FROM categories WHERE household_id = ? LIMIT 5'
      ).bind(householdId).all()
      
      const labels = (categories as any[]).map(cat => cat.name)
      const data = (categories as any[]).map(cat => cat.envelope_balance_cents / 100)
      const chartUrl = getQuickChartUrl('pie', labels, data, 'Budget Distribution')

      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { 
          content: "📈 **LEDGER Health Report**: Here is your current budget distribution across categories.",
          embeds: [{
            title: "Budget Distribution",
            image: { url: chartUrl },
            color: 0x6366f1
          }]
        }
      })
    }

    if (name === 'ledger-audit') {
      const { results } = await c.env.DB.prepare('SELECT action, table_name, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5').all()
      let content = "🔍 **Latest Audit Logs**:\n"
      ;(results as any[]).forEach(r => { content += `- ${r.created_at}: **${r.action}** on \`${r.table_name}\`\n` })
      return c.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content } })
    }
  }

  return c.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: "Unknown LEDGER command received." } })
})

export default discord
