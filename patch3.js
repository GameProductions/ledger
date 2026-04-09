const fs = require("fs");
const path = require("path");

const dirs = ["food", "foundation", "globot", "groupcord", "i-am", "ledger", "lets-draw-down"];
const basePath = "/Users/morenicano/Documents/coding/projects/bots";

for (const d of dirs) {
  const serverPath = path.join(basePath, d, "server.ts");
  const indexPath = path.join(basePath, d, "src/api/index.ts");
  
  // 1. Fix Server Request Handler
  if (fs.existsSync(serverPath)) {
    let t = fs.readFileSync(serverPath, "utf-8");
    const regexOldHandler = /\(requestHandler as any\)\(c\.req\.raw,\s*\{\s*env:\s*c\.env,\s*waitUntil/g;
    if (regexOldHandler.test(t)) {
        console.log(`Fixing Request Handler in ${d}/server.ts`);
        t = t.replace(regexOldHandler, `(requestHandler as any)({ request: c.req.raw, env: c.env, waitUntil`);
        fs.writeFileSync(serverPath, t);
    }
  }

  // 2. Fix CSP in server.ts
  if (fs.existsSync(serverPath)) {
    let t = fs.readFileSync(serverPath, "utf-8");
    if (t.includes("imgSrc: [") && !t.includes("https://www.gstatic.com")) {
      console.log(`Fixing CSP in ${d}/server.ts`);
      t = t.replace(/imgSrc:\s*\[([^\]]+)\]/, (match, p1) => {
         return `imgSrc: [${p1}, "https://www.gstatic.com", "https://raw.githubusercontent.com"]`;
      });
      fs.writeFileSync(serverPath, t);
    }
  }

  // 3. Fix CSP in src/api/index.ts (Ledger / Foundation)
  if (fs.existsSync(indexPath)) {
    let t = fs.readFileSync(indexPath, "utf-8");
    const oldT = t;
    if (t.includes("img-src ") && t.includes("data:")) {
      if (!t.includes("https://www.gstatic.com")) {
        console.log(`Fixing CSP string in ${d}/api/index.ts`);
        t = t.replace(/img-src ([^;]+)/g, "img-src $1 https://www.gstatic.com https://raw.githubusercontent.com");
      }
    }
    if (t.includes("imgSrc: [") && !t.includes("https://www.gstatic.com")) {
        console.log(`Fixing CSP Array in ${d}/api/index.ts`);
        t = t.replace(/imgSrc:\s*\[([^\]]+)\]/, (match, p1) => {
           return `imgSrc: [${p1}, "https://www.gstatic.com", "https://raw.githubusercontent.com"]`;
        });
    }
    if (t !== oldT) {
        fs.writeFileSync(indexPath, t);
    }
    
    // Also fix handler in API index if it has it
    const regexOldHandler = /\(requestHandler as any\)\(c\.req\.raw,\s*\{\s*env:\s*c\.env,\s*waitUntil/g;
    if (regexOldHandler.test(t)) {
        console.log(`Fixing Request Handler in ${d}/api/index.ts`);
        t = t.replace(regexOldHandler, `(requestHandler as any)({ request: c.req.raw, env: c.env, waitUntil`);
        fs.writeFileSync(indexPath, t);
    }
  }
}
