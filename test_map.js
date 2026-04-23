const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('src/web/components').concat(walk('src/web/pages'));

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('.map(')) {
            // Ignore if it has ?.map, or || []).map, or Array.isArray, or ])
            if (!line.includes('?.map(') && 
                !line.includes('|| []).map') && 
                !line.includes('Array.isArray') &&
                !line.includes('].map') &&
                !line.includes('Object.keys') &&
                !line.includes('Array.from') &&
                !line.includes('Array(')) {
                console.log(`${file}:${i+1}: ${line.trim()}`);
            }
        }
    });
});
