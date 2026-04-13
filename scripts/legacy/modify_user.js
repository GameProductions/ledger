const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/api/routes/user.ts');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('sessions')) {
  content = content.replace(/import { users, userOnboarding/g, "import { users, userOnboarding, sessions");
}

const sessionsRoutes = `
// Sessions
user.get('/sessions', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  const results = await db.select().from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.lastActiveAt))
  return c.json(results)
})

user.delete('/sessions/:id', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(sessions).where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
  await logAudit(c, 'sessions', id, 'REVOKE', null, null)
  return c.json({ success: true })
})

`;

if (!content.includes("user.get('/sessions'")) {
  content = content + '\n' + sessionsRoutes;
}

fs.writeFileSync(filePath, content);
console.log('Modified user.ts');
