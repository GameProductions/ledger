/**
 * GameProductions Fleet Standard — Version Prefix Hook
 *
 * This script is NOT called directly. The hook is installed as a pure
 * shell script at .git/hooks/prepare-commit-msg.
 *
 * SOURCE OF TRUTH: package.json "version" field.
 *
 * BEHAVIOR:
 *   - Every commit message is automatically prefixed with [vX.Y.Z]
 *   - Skips merge commits, squash commits, fixups, and amends
 *   - Never double-prefixes (idempotent)
 *
 * RE-INSTALL:
 *   sh scripts/install-hooks.sh
 *
 * MANUAL TEST:
 *   echo "My commit" > /tmp/test.txt
 *   sh .git/hooks/prepare-commit-msg /tmp/test.txt message
 *   cat /tmp/test.txt
 */
