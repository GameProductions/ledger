import { hashPassword } from '../src/auth-utils'

const password = process.argv[2]
if (!password) {
  console.error('Usage: tsx generate-hash.ts <password>')
  process.exit(1)
}

try {
  const hash = await hashPassword(password)
  console.log('\n--- NEW 100K HASH ---')
  console.log(hash)
  console.log('--- END ---\n')
  console.log('Update command for D1:')
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'ledger@gameproductions.net';`)
} catch (e) {
  console.error('Error generating hash:', e)
}
