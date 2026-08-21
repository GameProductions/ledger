import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../types'
import { HTTPException } from 'hono/http-exception'
import { getDb } from '#/index'
import { supportIssues, supportComments } from '#/schema'
import { eq, desc, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

const support = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Helper to verify GitHub Webhook HMAC-SHA256 signature
async function verifyGitHubWebhookSignature(secret: string, signatureHeader: string | undefined, payloadBody: string): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const signatureHex = signatureHeader.replace('sha256=', '');
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const signatureBytes = new Uint8Array(signatureHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
  return await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(payloadBody));
}

// Simple PII redactor for support payloads (Rule 13.17)
function sanitizeSupportMetadata(metadata: Record<string, any> = {}): Record<string, any> {
  const SENSITIVE_KEYS = ['password', 'token', 'secret', 'key', 'auth', 'email', 'cookie', 'session'];
  const sanitized: Record<string, any> = {};

  for (const [k, v] of Object.entries(metadata)) {
    const isSensitive = SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s));
    if (isSensitive) {
      sanitized[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      sanitized[k] = sanitizeSupportMetadata(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

support.get('/issues', async (c) => {
  const userId = c.get('userId')
  const db = getDb(c.env)
  
  const results = (await db.select()
      .from(supportIssues)
      .where(eq(supportIssues.userId, userId))
      .orderBy(desc(supportIssues.createdAt)) as any)
    
  return c.json({ success: true, data: results })
})

support.get('/issues/:id/comments', async (c) => {
  const { id } = c.req.param()
  const db = getDb(c.env)
  
  const results = (await db.select()
      .from(supportComments)
      .where(eq(supportComments.issueId, id))
      .orderBy(desc(supportComments.createdAt)) as any)
    
  return c.json({ success: true, data: results })
})

support.post('/issues/:id/comments', zValidator('json', z.object({
  body: z.string().min(1)
})), async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId')
  const { body } = c.req.valid('json')
  const db = getDb(c.env)
  
  const issue = (await db.select().from(supportIssues).where(eq(supportIssues.id, id)).limit(1).then(res => res[0]) as any)
  if (!issue) throw new HTTPException(404, { message: 'Issue not found' })
  
  const commentId = crypto.randomUUID()
  await db.insert(supportComments).values({
    id: commentId,
    issueId: id,
    userId,
    authorName: 'User',
    body
  })
  
  // Non-blocking async dispatch to GitHub (Rule 13.11)
  if (issue.githubIssueNumber && c.env.GITHUB_TOKEN && c.env.GITHUB_REPO) {
    c.executionCtx.waitUntil((async () => {
      try {
        const repoRaw = c.env.GITHUB_REPO.trim()
        const repoMatch = repoRaw.match(/([^/]+\/[^/]+)$/)
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
      } catch (err: any) {
        console.error('[Support] Failed to push comment to GitHub in background:', err)
      }
    })())
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
  
  if (!userId) {
    console.error('[Support] Unauthorized submission attempt: userId missing in context')
    throw new HTTPException(401, { message: 'Authentication required for support submission' })
  }

  const { title, description, category, priority, metadata } = c.req.valid('json')
  const db = getDb(c.env)
  
  try {
    const id = crypto.randomUUID()
    
    await db.insert(supportIssues).values({
      id,
      userId,
      title,
      description,
      category: category || 'General',
      priority
    })

    // Asynchronously create GitHub Issue with sanitized metadata (Rule 13.11 & 13.17)
    if (c.env.GITHUB_TOKEN && c.env.GITHUB_REPO) {
      c.executionCtx.waitUntil((async () => {
        try {
          const repoRaw = c.env.GITHUB_REPO.trim()
          const repoMatch = repoRaw.match(/([^/]+\/[^/]+)$/)
          const repo = repoMatch ? repoMatch[1].replace('.git', '') : repoRaw
          const cleanMetadata = sanitizeSupportMetadata(metadata || {})

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
${JSON.stringify(cleanMetadata, null, 2)}
\`\`\`
              `.trim(),
              labels: ['support', category || 'other'].filter(Boolean)
            })
          })

          if (res.ok) {
            const ghData: any = await res.json()
            await db.update(supportIssues).set({ 
              githubIssueUrl: ghData.html_url,
              githubIssueNumber: ghData.number,
              githubIssueId: ghData.id
            }).where(eq(supportIssues.id, id))
          } else {
            console.error(`[Support] GitHub API error for repo ${repo}:`, await res.text())
          }
        } catch (ghErr: any) {
          console.error('[Support] Background GitHub issue sync error:', ghErr)
        }
      })())
    }

    return c.json({ success: true, id }, 201)
  } catch (err: any) {
    console.error('[Support] Fatal backend error:', err.message)
    throw new HTTPException(500, { message: 'Failed to process support request. Please try again later.' })
  }
})

// GitHub Webhook for Real-Time Sync (Hardened with HMAC & Echo Suppression)
support.post('/webhook/github', async (c) => {
  const signature = c.req.header('x-hub-signature-256')
  const rawBody = await c.req.text()

  // 1. Verify Cryptographic Webhook HMAC Signature if secret is configured
  if (c.env.GITHUB_WEBHOOK_SECRET) {
    const isValid = await verifyGitHubWebhookSignature(c.env.GITHUB_WEBHOOK_SECRET, signature, rawBody)
    if (!isValid) {
      console.warn('[Support Webhook] Invalid GitHub HMAC signature rejected.')
      return c.text('Invalid signature', 401)
    }
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return c.text('Invalid JSON', 400)
  }

  const db = getDb(c.env)
  
  // 2. Handle Issue Status Changes
  if (payload.issue && (payload.action === 'closed' || payload.action === 'reopened')) {
    const status = payload.action === 'closed' ? 'closed' : 'open'
    await db.update(supportIssues)
      .set({ status })
      .where(eq(supportIssues.githubIssueId, payload.issue.id))
  }
  
  // 3. Handle New Incoming Comments (with Echo Suppression)
  if (payload.action === 'created' && payload.comment && payload.issue) {
    const commentBody = String(payload.comment.body || '')

    // Echo suppression: Ignore comments posted by the system/bot itself
    if (commentBody.startsWith('**[Ledger User Comment]**') || payload.comment.user?.type === 'Bot') {
      return c.json({ success: true, skipped: 'echo_suppressed' })
    }

    // Find the local ticket by GitHub Issue ID
    const tickets = (await db.select()
          .from(supportIssues)
          .where(eq(supportIssues.githubIssueId, payload.issue.id))
          .limit(1) as any)
    
    if (tickets.length > 0) {
      const ticket = tickets[0]
      
      // Prevent duplicates
      const existing = (await db.select()
              .from(supportComments)
              .where(eq(supportComments.githubCommentId, payload.comment.id))
              .limit(1) as any)
      
      if (existing.length === 0) {
        await db.insert(supportComments).values({
          id: crypto.randomUUID(),
          issueId: ticket.id,
          authorName: payload.comment.user.login,
          body: commentBody,
          githubCommentId: payload.comment.id
        })
      }
    }
  }
  
  return c.json({ success: true })
})

export default support
