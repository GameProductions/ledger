const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ledger/src/web/pages/auth/LoginPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add MFA State
if (!content.includes('const [mfaRequired, setMfaRequired] = useState(false)')) {
  content = content.replace(
    /const \[password, setPassword\] = useState\(''\)/,
    "const [password, setPassword] = useState('')\n  const [totpCode, setTotpCode] = useState('')\n  const [mfaRequired, setMfaRequired] = useState(false)"
  );
}

// 2. Handle 2FA intercept in handleLogin
content = content.replace(
  /body: JSON\.stringify\(\{ username, password \}\)/g,
  "body: JSON.stringify({ username, password, totpCode: totpCode || undefined })"
);

content = content.replace(
  /const authData = await res\.json\(\)\s+if \(authData\.token\) \{/,
  `const authData = await res.json()
      
      if (authData.requires2FA) {
        setMfaRequired(true)
        setLoading(false)
        return
      }

      if (authData.token) {`
);

// 3. Force onClick bindings for the Login button
content = content.replace(
  /<Button\s+type="submit"\s+variant="primary"\s+size="lg"\s+className="w-full py-6 rounded-2xl font-black uppercase tracking-\[0\.3em\] text-\[11px\] shadow-2xl shadow-primary\/20"\s+loading=\{loading\}\s+>/g,
  `<Button
                type="button" 
                onClick={(e) => { e.preventDefault(); handleLogin() }}
                variant="primary" 
                size="lg" 
                className="w-full py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-primary/20"
                loading={loading}
              >`
);

/* For the MFA view, if mfaRequired is true, replace the Password input with a TOTP input, 
or add a condition inside the form rendering */

const oldFormRender = `        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin() }}>`;
const mfaFormRender = `        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin() }}>
          {mfaRequired ? (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm mb-4">Enter the 6-digit code from your authenticator app.</p>
              <Input 
                label="AUTHENTICATOR CODE" 
                type="text" 
                value={totpCode} 
                onChange={e => setTotpCode(e.target.value)} 
                icon={<Lock className="w-5 h-5 text-gray-500" />} 
                placeholder="000000" 
                fullWidth 
              />
            </div>
          ) : (`

const mfaFormEnd = `          )}`

if (!content.includes('mfaRequired ? (')) {
  // We need to wrap the credential inputs in the false condition
  // The username and password inputs are rendered back-to-back normally.
  
  // Replace the form open tag
  content = content.replace(oldFormRender, mfaFormRender);
  
  // Find where the inputs end (right before the Submit button)
  const submitButtonStr = `<Button\n                type="button"\n                onClick={(e) => { e.preventDefault(); handleLogin() }}`;
  if (content.includes(submitButtonStr)) {
    content = content.replace(submitButtonStr, mfaFormEnd + '\n              ' + submitButtonStr);
  } else {
     // fallback if standard format
     const genericSubmitSTR = `<Button \n                variant="primary" \n                size="lg"`;
     content = content.replace(genericSubmitSTR, mfaFormEnd + '\n              <Button type="button" onClick={(e) => { e.preventDefault(); handleLogin() }}\n                variant="primary" \n                size="lg"');
  }
}

fs.writeFileSync(filePath, content);
console.log('Modified LoginPage.tsx');
