import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../types'

const support = new Hono<{ Bindings: Bindings, Variables: Variables }>()

const SupportIssueSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  metadata: z.record(z.any()).optional()
})

support.post('/issues', zValidator('json', SupportIssueSchema), async (c) => {
  const userId = c.get('userId')
  const { title, description, category, priority, metadata } = c.req.valid('json')
  
  // 1. Ensure support_issues table exists (Self-Healing)
  await c.env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS support_issues (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      github_issue_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run()

  const id = crypto.randomUUID()
  
  // 2. Save locally
  await c.env.DB.prepare(
    'INSERT INTO support_issues (id, user_id, title, description, category, priority) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, title, description, category || 'General', priority).run()

  // 3. GitHub Integration
  let githubUrl = null
  if (c.env.GITHUB_TOKEN && c.env.GITHUB_REPO) {
    try {
      const repo = c.env.GITHUB_REPO // e.g. GameProductions/ledger
      const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'LEDGER-Support-Portal'
        },
        body: JSON.stringify({
          title: `[Support] ${title}`,
          body: `
### Description
${description}

---
**Category:** ${category || 'General'}
**Priority:** ${priority}
**Internal Reference:** ${id}
**System Metadata:**
\`\`\`json
${JSON.stringify(metadata || {}, null, 2)}
\`\`\`
          `.trim(),
          labels: ['support', category || 'support-request'].filter(Boolean)
        })
      })

      if (res.ok) {
        const ghData: any = await res.json()
        githubUrl = ghData.html_url
        await c.env.DB.prepare('UPDATE support_issues SET github_issue_url = ? WHERE id = ?').bind(githubUrl, id).run()
      } else {
        const errText = await res.text()
        console.error('[Support] GitHub issue creation failed:', errText)
      }
    } catch (err) {
      console.error('[Support] GitHub integration error:', err)
    }
  }

  return c.json({ 
    success: true, 
    id, 
    github_issue_url: githubUrl 
  }, 201)
})

export default support
