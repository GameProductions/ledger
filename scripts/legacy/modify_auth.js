const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/api/routes/auth.ts');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('import { sessions }')) {
  content = content.replace(/import { users, passkeys } from '\.\.\/db\/schema'/, "import { users, passkeys, sessions } from '../db/schema'");
}

const trackerFunc = `

async function createSessionTracker(c: any, userId: string) {
  const db = getDb(c.env)
  const sessionId = \`sess-\${crypto.randomUUID()}\`
  const userAgent = c.req.header('User-Agent') || 'Unknown'
  const cfIp = c.req.header('CF-Connecting-IP') || 'Unknown'
  
  const browserM = userAgent.match(/(firefox|msie|chrome|safari|trident|edge)/i)
  const osM = userAgent.match(/(mac os x|windows nt|linux|android|iphone|ipad)/i)
  
  const browser = browserM ? browserM[0] : 'Unknown'
  const os = osM ? osM[0] : 'Unknown'
  
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    deviceName: \`\${os} Device\`,
    os,
    browser,
    ipAddress: cfIp,
    lastActiveAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  })
}
`;

if (!content.includes('function createSessionTracker')) {
  content = content.replace('const auth = new Hono<{ Bindings: Bindings, Variables: Variables }>()', 'const auth = new Hono<{ Bindings: Bindings, Variables: Variables }>()\n' + trackerFunc);
}

// Replace generateToken calls
content = content.replace(/const token = await authService\.generateToken\(user\.id\)/g, 'const token = await authService.generateToken(user.id)\n    await createSessionTracker(c, user.id)');
content = content.replace(/const token = await authService\.generateToken\(finalUserId!\)/g, 'const token = await authService.generateToken(finalUserId!)\n    await createSessionTracker(c, finalUserId!)');
content = content.replace(/const token = await authService\.generateToken\(userId\)/g, 'const token = await authService.generateToken(userId)\n    await createSessionTracker(c, userId)');
content = content.replace(/const token = await authService\.generateToken\(passkey\.userId\)/g, 'const token = await authService.generateToken(passkey.userId)\n  await createSessionTracker(c, passkey.userId)');

fs.writeFileSync(filePath, content);
console.log('Modified auth.ts');
