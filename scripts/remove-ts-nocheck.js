const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    if (!fs.existsSync(file)) return;
    try {
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
          results = results.concat(walk(file));
        }
      } else {
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          results.push(file);
        }
      }
    } catch (e) {}
  });
  return results;
};

const files = walk('.');
files.forEach((file) => {
  if (file.includes('remove-ts-nocheck.js') || file.includes('fix-ts.js')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  if (content.startsWith('// @ts-nocheck\n')) {
    content = content.replace('// @ts-nocheck\n', '');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Stripped @ts-nocheck from ${file}`);
  } else if (content.startsWith('// @ts-nocheck\r\n')) {
    content = content.replace('// @ts-nocheck\r\n', '');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Stripped @ts-nocheck from ${file}`);
  }
});
