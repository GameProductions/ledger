import fs from 'fs';

/**
 * GameProductions Fleet Standard — Version Prefix Hook
 * Automatically prepends [vX.Y.Z] to every commit message.
 * 
 * Installed via: .git/hooks/prepare-commit-msg
 * Usage:         node scripts/prefix-commit-version.js "$1" "$2"
 */
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const version = packageJson.version;
  const commitMsgFile = process.argv[2];
  const commitSource = process.argv[3]; // "message", "merge", "squash", "template", or empty

  if (!commitMsgFile) {
    process.exit(0);
  }

  // Only prefix on standard commits — skip merges, squashes, and amends
  if (commitSource && commitSource !== 'message') {
    process.exit(0);
  }

  const commitMsg = fs.readFileSync(commitMsgFile, 'utf8');
  const prefix = `[v${version}]`;

  // Don't double-prefix
  if (!commitMsg.startsWith(prefix) && !commitMsg.match(/^\[v\d+\.\d+\.\d+\]/)) {
    fs.writeFileSync(commitMsgFile, `${prefix} ${commitMsg}`);
    console.log(`✅ Prefixed commit message with ${prefix}`);
  }
} catch (error) {
  // Fail silently — never block a commit
  console.error('⚠️  Version prefix skipped:', error.message);
}
