import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));

const swPath = path.resolve(__dirname, '../dist/sw.js');

if (fs.existsSync(swPath)) {
  let content = fs.readFileSync(swPath, 'utf8');
  content = content.replace(/const CACHE_NAME = 'ledger-v[^']*'/, `const CACHE_NAME = 'ledger-v${pkg.version}'`);
  fs.writeFileSync(swPath, content);
  console.log(`[Build] Updated Service Worker cache to v${pkg.version}`);
} else {
  console.warn(`[Build] sw.js not found at ${swPath}`);
}
