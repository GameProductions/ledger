import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../types'
import { HTTPException } from 'hono/http-exception'
import { getDb } from '../db'
import { supportIssues } from '../db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

const support = new Hono<{ Bindings: Bindings, Variables: Variables }>()

const SupportIssueSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  metadata: z.record(z.string(), z.any()).optional()
})

support.post('/issues', zValidator('json', SupportIssueSchema), async (c) => {
  const userId = c.get('userId')
  
  // 1. Defensive Auth Guard (Prevent NULL DB inserts)
  if (!userId) {
    console.error('[Support] Unauthorized submission attempt: userId missing in context')
    throw new HTTPException(401, { message: 'Authentication required for support submission' })
  }

  const { title, description, category, priority, metadata } = c.req.valid('json')
  const db = getDb(c.env)
  
  try {
    // 2. Self-Healing Table Structure
    await db.run(sql`
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
    `)

    const id = crypto.randomUUID()
    
    // 3. Persistent Storage
    await db.insert(supportIssues).values({
      id,
      userId,
      title,
      description,
      category: category || 'General',
      priority
    })

    // 4. GitHub Integration (Sanitized)
    let githubUrl = null
    if (c.env.GITHUB_TOKEN && c.env.GITHUB_REPO) {
      try {
        // Sanitize Repo Name (Extract owner/repo in case user provided full URL)
        const repoRaw = c.env.GITHUB_REPO.trim()
        const repoMatch = repoRaw.match(/([^\/]+\/[^\/]+)$/)
        const repo = repoMatch ? repoMatch[1].replace('.git', '') : repoRaw

        const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
          method: 'POST',
          headers: {
            'Authorization': c.env.GITHUB_TOKEN.startsWith('ghp_') ? `token ${c.env.GITHUB_TOKEN}` : `Bearer ${c.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'LEDGER-Forensic-Support-Engine'
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
            labels: ['support', category || 'other'].filter(Boolean)
          })
        })

        if (res.ok) {
          const ghData: any = await res.json()
          githubUrl = ghData.html_url
          await db.update(supportIssues).set({ githubIssueUrl: githubUrl }).where(eq(supportIssues.id, id))
        } else {
          const errText = await res.text()
          console.error(`[Support] GitHub API error for repo ${repo}:`, errText)
        }
      } catch (ghErr) {
        console.error('[Support] GitHub Integration exception:', ghErr)
      }
    }

    return c.json({ 
      success: true, 
      id, 
      github_issue_url: githubUrl 
    }, 201)

  } catch (err: any) {
    console.error('[Support] Fatal backend error:', err.message)
    throw new HTTPException(500, { message: 'Failed to process support request. Please try again later.' })
  }
})

export default support
