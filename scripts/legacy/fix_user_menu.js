const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/web/components/UserMenu.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /\{\!isPcc && globalRole === 'owner' && \(/g,
  "{!isPcc && (globalRole === 'owner' || profile?.globalRole === 'owner') && ("
);

fs.writeFileSync(filePath, content);
console.log('Fixed UserMenu.tsx');
