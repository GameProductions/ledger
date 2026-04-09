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
  
  const regexGen = /const sessionId = \(c\.get as any\)\(['"`](?:session_id|sessionId)['"`]\)(?:\s*as string)?;\s*if\s*\(sessionId\)\s*\{\s*await c\.env\.DB\.prepare\([\s\S]*?UPDATE users SET passkey_verified_at.*?id = \?['"`]\)\.bind\((.*?)\)\.run\(\);\s*\}/i;
  let matches = 0;
  while(regexGen.test(t)) {
      t = t.replace(regexGen, `await c.env.DB.prepare("UPDATE users SET passkey_verified_at = ? WHERE id = ?").bind($1).run();`);
      matches++;
  }
  
  if (matches > 0) {
      fs.writeFileSync(p, t);
      console.log(`Patched IF wrap in ${p} (${matches} matches)`);
  }
}
