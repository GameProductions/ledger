#!/bin/sh
#
# GameProductions Fleet Standard — Install Git Hooks
# Run this once after cloning: sh scripts/install-hooks.sh
#
set -e

HOOKS_DIR=".git/hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "❌ Not a git repository (no .git/hooks directory found)."
  exit 1
fi

# Write pre-commit hook (runs version bump, dynamic file syncing, and stages them)
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/sh
node scripts/prepare-commit.cjs pre-commit
EOF

chmod +x "$HOOKS_DIR/pre-commit"

# Write prepare-commit-msg hook (prefixes the commit message with the newly bumped version)
cat > "$HOOKS_DIR/prepare-commit-msg" << 'EOF'
#!/bin/sh
node scripts/prepare-commit.cjs "$1" "$2"
EOF

chmod +x "$HOOKS_DIR/prepare-commit-msg"

echo "✅ Git hooks (pre-commit & prepare-commit-msg) successfully installed."
