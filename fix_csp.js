const fs = require('fs');
const path = require('path');

const files = [
  '../ledger/src/api/index.ts',
  '../ledger/server.ts'
];

for (const fp of files) {
  const filePath = path.join(__dirname, fp);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // add https://cdn-icons-png.flaticon.com to img-src if it's not there
    if (!content.includes('https://cdn-icons-png.flaticon.com')) {
       content = content.replace(
         /img-src 'self' data: https:\/\/cdn.simpleicons.org/g,
         "img-src 'self' data: https://cdn-icons-png.flaticon.com https://cdn.simpleicons.org"
       );
       fs.writeFileSync(filePath, content);
       console.log('Fixed CSP in', fp);
    }
  }
}
