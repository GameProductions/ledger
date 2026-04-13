const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../ledger/src/web/hooks/useApi.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove `data` from useApi fetcher dependency
content = content.replace(
  /}, \[path, token, data, options\.refreshInterval, logout\]\)/g,
  "}, [path, token, options.refreshInterval, logout])"
);

// 2. Change setData to use functional update to avoid closures on `data`
const oldSetData = `      // Only update state if data actually changed
      if (JSON.stringify(json) !== JSON.stringify(data)) {
        setData(json)
      }`;

const newSetData = `      // Only update state if data actually changed
      setData((prevData) => {
        if (JSON.stringify(json) !== JSON.stringify(prevData)) {
          return json;
        }
        return prevData;
      });`;

content = content.replace(oldSetData, newSetData);

// 3. Fix the 2000ms bypass bug so ALL fetches are paced by default!
const oldPace = `if (Date.now() - lastFetchTime.current < 2000 && options.refreshInterval) return`;
const newPace = `if (Date.now() - lastFetchTime.current < 2000) return`;
content = content.replace(oldPace, newPace);

fs.writeFileSync(filePath, content);
console.log('Fixed useApi.ts infinite loop');
