const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/web/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "if (globalRole !== 'super_admin') return <DashboardPage view={view} setView={setView} />",
  "if (globalRole !== 'super_admin' && localStorage.getItem('ledger_global_role') !== 'super_admin') return <DashboardPage view={view} setView={setView} />"
);

fs.writeFileSync(filePath, content);
console.log('Fixed App.tsx router');
