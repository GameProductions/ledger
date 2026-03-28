import { hashPassword, verifyPassword } from '../src/auth-utils'

const testPass = 'test1234'
const hash = await hashPassword(testPass)
console.log('Test Hash (100k):', hash)

const isMatch = await verifyPassword(testPass, hash)
console.log('Verify Result:', isMatch ? 'SUCCESS' : 'FAILURE')

if (!isMatch) {
  process.exit(1)
}

// Test with the user's generated hash if possible (mocking the verify call)
const userHash = '100000.53UvVA9IuRdKFlEEJHJEqQ==.HB5fSEYEDxkklsYzwrW+hd4FN1pxaCfhRoFgpui/vYg='
// Since we don't know the password used to generate this, we can't fully verify it 
// but we can check if it parses correctly.
try {
  const [iterations] = userHash.split('.')
  console.log('Parsing user hash iterations:', iterations)
} catch (e) {
  console.error('Parsing failed:', e)
}
