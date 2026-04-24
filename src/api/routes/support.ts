import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../types'
import { HTTPException } from 'hono/http-exception'
import { getDb } from '../db'
import { supportIssues, supportComments } from '../db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { toSnake } from '../utils'

const support = new Hono<{ Bindings: Bindings, Variables: Variables }>()

support.get('/issues', async (c) => {
  const userId = c.get('userId')
  const db = getDb(c.env)
  
  const results = await db.select()
    .from(supportIssues)
    .where(eq(supportIssues.userId, userId))
    .orderBy(desc(supportIssues.createdAt))
    
  return c.json({ success: true, data: toSnake(results) })
})

support.get('/issues/:id/comments', async (c) => {
  const { id } = c.req.param()
  const db = getDb(c.env)
  
  const results = await db.select()
    .from(supportComments)
    .where(eq(supportComments.issueId, id))
    .orderBy(desc(supportComments.createdAt))
    
  return c.json({ success: true, data: toSnake(results) })
})

support.post('/issues/:id/comments', zValidator('json', z.object({
  body: z.string().min(1)
})), async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId')
  const { body } = c.req.valid('json')
  const db = getDb(c.env)
  
  const issue = await db.select().from(supportIssues).where(eq(supportIssues.id, id)).limit(1).then(res => res[0])
  if (!issue) throw new HTTPException(404, { message: 'Issue not found' })
  
  const commentId = crypto.randomUUID()
  await db.insert(supportComments).values({
    id: commentId,
    issueId: id,
    userId,
    authorName: 'User', // Simplified for now
    body
  })
  
  // Push to GitHub if linked
  if (issue.githubIssueNumber && c.env.GITHUB_TOKEN && c.env.GITHUB_REPO) {
     try {
       const repoRaw = c.env.GITHUB_REPO.trim()
       const repoMatch = repoRaw.match(/([^\/]+\/[^\/]+)$/)
       const repo = repoMatch ? repoMatch[1].replace('.git', '') : repoRaw
       
       await fetch(`https://api.github.com/repos/${repo}/issues/${issue.githubIssueNumber}/comments`, {
         method: 'POST',
         headers: {
           'Authorization': c.env.GITHUB_TOKEN.startsWith('ghp_') ? `token ${c.env.GITHUB_TOKEN}` : `Bearer ${c.env.GITHUB_TOKEN}`,
           'Accept': 'application/vnd.github.v3+json',
           'User-Agent': 'LEDGER-Forensic-Support-Engine'
         },
         body: JSON.stringify({ body: `**[Ledger User Comment]**\n\n${body}` })
       })
     } catch (err) {
       console.error('[Support] Failed to push comment to GitHub:', err)
     }
  }
  
  return c.json({ success: true, id: commentId })
})

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
        github_issue_number INTEGER,
        github_issue_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS support_comments (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL,
        user_id TEXT,
        author_name TEXT,
        body TEXT NOT NULL,
        github_comment_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (issue_id) REFERENCES support_issues(id)
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
          await db.update(supportIssues).set({ 
            githubIssueUrl: githubUrl,
            githubIssueNumber: ghData.number,
            githubIssueId: ghData.id
          }).where(eq(supportIssues.id, id))
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

// GitHub Webhook for Real-Time Sync
support.post('/webhook/github', async (c) => {
  const payload = await c.req.json()
  const db = getDb(c.env)
  
  // 1. Handle Issue Status Changes
  if (payload.issue && (payload.action === 'closed' || payload.action === 'reopened')) {
    const status = payload.action === 'closed' ? 'closed' : 'open'
    await db.update(supportIssues)
      .set({ status })
      .where(eq(supportIssues.githubIssueId, payload.issue.id))
  }
  
  // 2. Handle New Comments
  if (payload.action === 'created' && payload.comment && payload.issue) {
    // Find the local ticket by GitHub Issue ID
    const tickets = await db.select()
      .from(supportIssues)
      .where(eq(supportIssues.githubIssueId, payload.issue.id))
      .limit(1)
    
    if (tickets.length > 0) {
      const ticket = tickets[0]
      
      // Check if comment already exists (prevent duplicates)
      const existing = await db.select()
        .from(supportComments)
        .where(eq(supportComments.githubCommentId, payload.comment.id))
        .limit(1)
      
      if (existing.length === 0) {
        await db.insert(supportComments).values({
          id: crypto.randomUUID(),
          issueId: ticket.id,
          authorName: payload.comment.user.login,
          body: payload.comment.body,
          githubCommentId: payload.comment.id
        })
      }
    }
  }
  
  return c.json({ success: true })
})

export default support
