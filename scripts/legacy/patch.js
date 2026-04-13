const fs = require("fs");
const paths = [
  "/Users/morenicano/Documents/coding/projects/bots/food/src/api/auth.ts",
  "/Users/morenicano/Documents/coding/projects/bots/foundation/src/api/admin.ts",
  "/Users/morenicano/Documents/coding/projects/bots/globot/src/api/auth.ts",
  "/Users/morenicano/Documents/coding/projects/bots/groupcord/src/api/routes/auth.ts",
  "/Users/morenicano/Documents/coding/projects/bots/i-am/src/api/auth.ts",
  "/Users/morenicano/Documents/coding/projects/bots/ledger/src/api/routes/webauthn.ts",
  "/Users/morenicano/Documents/coding/projects/bots/lets-draw-down/src/api/routes/webauthn.ts"
];

for(const p of paths) {
  if (!fs.existsSync(p)) continue;
  let t = fs.readFileSync(p, "utf8");
  
  // 1. Replace generate registration `if (sessionId)` block safely
  const regexGen = /const sessionId = \(c\.get as any\)\(['"`](?:session_id|sessionId)['"`]\);\s*if\s*\(sessionId\)\s*\{\s*await c\.env\.DB\.prepare\([\s\S]*?UPDATE sessions SET passkey_verified_at.*?\}\s*/i;
  if(regexGen.test(t)) {
      t = t.replace(regexGen, 'await c.env.DB.prepare(\'UPDATE users SET passkey_verified_at = ? WHERE id = ?\').bind(options.challenge, userId).run();\n');
  }

  // 2. Replace generate registration without `if(sessionId)` safely
  const regexGen2 = /await c\.env\.DB\.prepare\(['"`]\s*UPDATE sessions SET passkey_verified_at[\s\S]*?bind\([\s\S]*?\.run\(\);/i;
  if (regexGen2.test(t)) {
      t = t.replace(regexGen2, 'await c.env.DB.prepare(\'UPDATE users SET passkey_verified_at = ? WHERE id = ?\').bind(options.challenge, userId).run();');
  }
  
  // 3. Replace select in verify
  const regexSelect = /const session = await c\.env\.DB\.prepare\(['"`]\s*SELECT passkey_verified_at FROM sessions WHERE id = \?['"`]\)\.bind\(sessionId\)\.first\(\);/;
  if (regexSelect.test(t)) {
      t = t.replace(regexSelect, 'const session = await c.env.DB.prepare(\'SELECT passkey_verified_at FROM users WHERE id = ?\').bind(userId).first();');
  }
  
  // 4. Replace verify update
  const regexUpdateVerify = /UPDATE sessions SET passkey_verified_at = CURRENT_TIMESTAMP WHERE id = \?['"`]\)\.bind\(sessionId\)/g;
  if (regexUpdateVerify.test(t)) {
      t = t.replace(regexUpdateVerify, 'UPDATE users SET passkey_verified_at = CURRENT_TIMESTAMP WHERE id = ?\').bind(userId)');
  }

  // 5. Replace verify update null
  const regexUpdateVerifyNull = /UPDATE sessions SET passkey_verified_at = NULL WHERE id = \?['"`]\)\.bind\(sessionId\)/g;
  if (regexUpdateVerifyNull.test(t)) {
      t = t.replace(regexUpdateVerifyNull, 'UPDATE users SET passkey_verified_at = NULL WHERE id = ?\').bind(userId)');
  }

  fs.writeFileSync(p, t);
  console.log("Patched webauthn sessions logic in", p);
}
