const fs = require('fs');
const path = require('path');

const rootDir = '/Users/morenicano/Documents/coding/projects/bots';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory && !f.includes('node_modules') && !f.includes('.git')) {
      walk(dirPath, callback);
    } else if (f === 'HelpCenter.tsx') {
      callback(dirPath);
    }
  });
}

walk(rootDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  const regex = /<div className="help-header">[\s\S]*?<\/div>/g;
  if (content.match(regex)) {
    console.log(`Updating: ${filePath}`);
    const newContent = content.replace(regex, '');
    fs.writeFileSync(filePath, newContent);
  }
});
