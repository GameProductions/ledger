const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/web/pages/auth/LoginPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The block we want to conditionally wrap:
const passBlock = `            <div className="space-y-6">
              <Input 
                label="User ID"`;

if (content.includes(passBlock) && !content.includes('mfaRequired ? (')) {
  // We'll replace it entirely
  const exactMatch = content.match(/<form[\s\S]*?className="space-y-8"[\s\S]*?onSubmit=\{\(e\) => \{[\s\S]*?e\.preventDefault\(\);[\s\S]*?handleLogin\(\);[\s\S]*?\}\}[\s\S]*?>/);
  if (exactMatch) {
     content = content.replace(exactMatch[0], `<form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            {mfaRequired ? (
              <div className="space-y-4 reveal">
                <p className="text-gray-400 text-sm mb-4">Enter the 6-digit code from your authenticator app.</p>
                <Input 
                  label="AUTHENTICATOR CODE" 
                  type="text" 
                  value={totpCode} 
                  onChange={e => setTotpCode(e.target.value)} 
                  placeholder="000000"
                  className="bg-white/5 border-white/5 focus:border-primary p-5 rounded-2xl font-bold font-mono tracking-[0.5em] text-center text-xl"
                  autoFocus
                />
              </div>
            ) : (`);
     
     // Now find the end of the input div
     const endOfInputBlock = `                   </button>
                </div>
              </div>`;
              
     if (content.includes(endOfInputBlock)) {
       content = content.replace(endOfInputBlock, endOfInputBlock + '\n            )}');
     }
  }
}

fs.writeFileSync(filePath, content);
console.log('Fixed MFA UI form');
