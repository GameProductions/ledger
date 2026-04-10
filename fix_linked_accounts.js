const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/api/routes/user.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldSql = `  const dbRes = await c.env.DB.prepare(\`
    SELECT la.*, sp.name as provider_name, sp.visibility as provider_branding, pm.id as payment_method_name 
    FROM user_linked_accounts la 
    JOIN service_providers sp ON la.provider_id = sp.id 
    LEFT JOIN user_payment_methods pm ON la.account_id = pm.id 
    WHERE la.user_id = ?
  \`).bind(userId).all()`;

const newSql = `  const dbRes = await c.env.DB.prepare(\`
    SELECT la.*, sp.name as provider_name, sp.visibility as provider_branding, 'N/A' as payment_method_name 
    FROM linked_providers la 
    JOIN service_providers sp ON la.service_provider_id = sp.id 
    WHERE la.user_id = ?
  \`).bind(userId).all()`;

content = content.replace(oldSql, newSql);

fs.writeFileSync(filePath, content);
console.log('Fixed Linked Accounts Query');
