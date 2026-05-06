const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/web/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "if (globalRole !== 'owner') return <DashboardPage view={view} setView={setView} />",
  "if (globalRole !== 'owner' && localStorage.getItem('ledger_global_role') !== 'owner') return <DashboardPage view={view} setView={setView} />"
);

fs.writeFileSync(filePath, content);
console.log('Fixed App.tsx router');
