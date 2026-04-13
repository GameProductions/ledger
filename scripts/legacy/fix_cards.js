const fs = require('fs');
const path = require('path');

const files = [
  '../ledger/src/web/components/SecurityDashboard.tsx',
  '../ledger/src/web/components/ArchivalVault.tsx'
];

for (const fp of files) {
  const filePath = path.join(__dirname, fp);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace imports
  content = content.replace(
    /import \{ Card, CardContent, CardHeader, CardTitle \} from '\.\/ui\/Card';/,
    "import { Card } from './ui/Card';"
  );
  
  if (fp.includes('SecurityDashboard')) {
    content = content.replace(
      /<Card className="bg-\[#121212\] border-white\/5">[\s\S]*?<CardHeader className="border-b border-white\/5 pb-4">/,
      '<Card className="bg-[#121212] border-white/5" title="Active Device Sessions" subtitle="Manage and revoke unauthorized logins across your network.">'
    );
    content = content.replace(
      /<div className="flex items-center gap-3">[\s\S]*?<\/div>\n\s*<\/CardHeader>/,
      ''
    );
    content = content.replace(/<CardContent className="p-0">/, '');
    content = content.replace(/<\/CardContent>/, '');
  }
  
  if (fp.includes('ArchivalVault')) {
    content = content.replace(
      /<Card className="bg-\[#121212\] border-white\/5 relative overflow-hidden">[\s\S]*?<div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">/,
      '<Card className="bg-[#121212] border-white/5 relative overflow-hidden" title="Archival Vault" subtitle="Safely restore historically truncated infrastructure and households.">\n        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">'
    );
    content = content.replace(
      /<CardHeader className="border-b border-white\/5 pb-4 relative z-10">[\s\S]*?<\/CardHeader>/,
      ''
    );
    content = content.replace(/<CardContent className="p-0 relative z-10">/, '');
    content = content.replace(/<\/CardContent>/, '');
  }

  fs.writeFileSync(filePath, content);
}
console.log('Fixed cards');
