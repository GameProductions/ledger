const { execSync } = require('child_process');

let output = execSync('npx wrangler d1 execute DB --remote --command="SELECT name FROM sqlite_schema WHERE type=\'table\' AND name NOT LIKE \'sqlite_%\' AND name NOT LIKE \'_cf_%\';" --json', { encoding: 'utf-8' });
let tables = JSON.parse(output)[0].results.map(row => row.name);

console.log(`Found ${tables.length} tables to drop...`);

let loops = 0;
while (tables.length > 0 && loops < 10) {
  let dropped = 0;
  for (const table of tables) {
    try {
      execSync(`npx wrangler d1 execute DB --remote --command="DROP TABLE IF EXISTS \\\`${table}\\\`;"`);
      console.log(`Dropped: ${table}`);
      dropped++;
    } catch (e) {
      // Failed due to foreign keys, skip for now
    }
  }
  
  if (dropped === 0) break;
  
  output = execSync('npx wrangler d1 execute DB --remote --command="SELECT name FROM sqlite_schema WHERE type=\'table\' AND name NOT LIKE \'sqlite_%\' AND name NOT LIKE \'_cf_%\';" --json', { encoding: 'utf-8' });
  tables = JSON.parse(output)[0].results.map(row => row.name);
  loops++;
}

console.log(`Remaining tables: ${tables.length}`);
