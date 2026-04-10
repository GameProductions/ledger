const fs = require('fs');
const path = require('path');

const files = [
  '../ledger/src/web/components/SecurityDashboard.tsx',
  '../ledger/src/web/components/ArchivalVault.tsx'
];

for (const fp of files) {
  const filePath = path.join(__dirname, fp);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace AuthContext path
  content = content.replace(
    /import \{ useAuth \} from '\.\.\/\.\.\/contexts\/AuthContext';/,
    "import { useAuth } from '../context/AuthContext';"
  );
  
  // Replace toast import
  content = content.replace(
    /import \{ showToast \} from '\.\.\/\.\.\/utils\/toast';/,
    "import { useToast } from '../context/ToastContext';"
  );
  
  // Add const { showToast } = useToast(); inside component
  content = content.replace(
    /const \{ token \} = useAuth\(\);/,
    "const { token } = useAuth();\n  const { showToast } = useToast();"
  );
  
  fs.writeFileSync(filePath, content);
}
console.log('Fixed imports');
