const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/web/pages/SettingsPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Ensure useTabState imported
if (!content.includes('useTabState')) {
  // replace the first import line with useTabState
  content = content.replace(
    /import HouseholdRegistry from '\.\.\/components\/HouseholdRegistry'/,
    "import HouseholdRegistry from '../components/HouseholdRegistry'\nimport { useTabState } from '../hooks/useTabState'\nimport { SecurityDashboard } from '../components/SecurityDashboard'\nimport { ArchivalVault } from '../components/ArchivalVault'"
  );
}

// Replace useState with useTabState
content = content.replace(
  /const \[activeTab, setActiveTab\] = useState<.*>\('security'\)/,
  "const [activeTab, setActiveTab] = useTabState<'security' | 'social' | 'display' | 'data'>('security')"
);

// Inject SecurityDashboard and ArchivalVault into Data & Household tab (or Security tab)
// Actually, ArchivalVault belongs in 'data', SecurityDashboard belongs in 'security'

const securityTabEnd = `              <div className="card p-8 space-y-6 border-l-4 border-blue-500/50">`;
if (content.includes(securityTabEnd) && !content.includes('<SecurityDashboard />')) {
  // We'll put it right at the top of the security tab
  content = content.replace(
    /\{\/\* TAB: SECURITY \*\/\}\s*\{activeTab === 'security' && \(\s*<div className="grid grid-cols-1 md:grid-cols-2 gap-8 reveal">/,
    `{/* TAB: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-12 reveal">
              <SecurityDashboard />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">`
  );
  
  // also fix closing div
  content = content.replace(
    /              <\/div>\n            <\/div>\n          \)}/,
    `              </div>
            </div>
            </div>
          )}`
  );
}

const dataTabEnd = `<HouseholdRegistry />`;
if (content.includes(dataTabEnd) && !content.includes('<ArchivalVault />')) {
  content = content.replace(
    /<HouseholdRegistry \/>/,
    `<HouseholdRegistry />\n                  <ArchivalVault />`
  );
}

fs.writeFileSync(filePath, content);
console.log('Modified SettingsPage.tsx');
