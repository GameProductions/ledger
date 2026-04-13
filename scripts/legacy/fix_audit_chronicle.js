const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/web/components/AuditChronicle.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /\{new Date\(log\.created_at\)\.toLocaleString\(\)\} • \{log\.actor_id\}/g,
  "{new Date(log.created_at).toLocaleString()} • {log.actor_name || log.actor_id || 'System'}"
);
content = content.replace(
  /\{log\?\.action\?\.toUpperCase\(\) \|\| ''\} \{log\?\.table_name\?\.slice\(0, -1\) \|\| 'Unknown'\}/g,
  "{log?.action?.toUpperCase() || ''} {log?.target_type?.replace(/s$/, '') || 'Unknown Node'}"
);
content = content.replace(
  /Record: \{log\?\.record_id\?\.substring\(0, 8\) \|\| 'N\/A'\}\.\.\./g,
  "Record: {log?.target_id?.substring(0, 8) || 'N/A'}..."
);

fs.writeFileSync(filePath, content);
console.log('Fixed AuditChronicle.tsx');
