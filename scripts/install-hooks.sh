#!/bin/sh
#
# GameProductions Fleet Standard — Install Git Hooks
# Run this once after cloning: sh scripts/install-hooks.sh
#
set -e

HOOKS_DIR=".git/hooks"
HOOK_FILE="$HOOKS_DIR/prepare-commit-msg"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "❌ Not a git repository (no .git/hooks directory found)."
  exit 1
fi

cat > "$HOOK_FILE" << 'EOF'
#!/bin/sh
#
# GameProductions Fleet Standard — Version Prefix Hook
# Reads version from package.json and prepends [vX.Y.Z] to commit messages.
# Source of truth: package.json "version" field.
#
COMMIT_MSG_FILE="$1"
COMMIT_SOURCE="$2"

# Only run on standard commits — skip merges, squashes, fixups, and amends
if [ -n "$COMMIT_SOURCE" ] && [ "$COMMIT_SOURCE" != "message" ]; then
  exit 0
fi

if [ ! -f "package.json" ]; then
  exit 0
fi

VERSION=$(python3 -c "import sys,json; print(json.load(open('package.json')).get('version',''))" 2>/dev/null)

if [ -z "$VERSION" ]; then
  exit 0
fi

PREFIX="[v${VERSION}]"
CURRENT_MSG=$(cat "$COMMIT_MSG_FILE")

# Don't double-prefix
if echo "$CURRENT_MSG" | grep -qE '^\[v[0-9]+\.[0-9]+\.[0-9]+\]'; then
  exit 0
fi

echo "${PREFIX} ${CURRENT_MSG}" > "$COMMIT_MSG_FILE"
EOF

chmod +x "$HOOK_FILE"
echo "✅ prepare-commit-msg hook installed."
