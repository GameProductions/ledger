const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/web/components/UserMenu.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /\{\!isPcc && globalRole === 'super_admin' && \(/g,
  "{!isPcc && (globalRole === 'super_admin' || profile?.globalRole === 'super_admin') && ("
);

fs.writeFileSync(filePath, content);
console.log('Fixed UserMenu.tsx');
