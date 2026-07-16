#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== harness-foundry npm publish ==="

if ! npm whoami >/dev/null 2>&1; then
  echo "ERROR: Not logged in to npm (or token expired)."
  echo ""
  echo "Fix:"
  echo "  npm login --auth-type=web --scope=@cobusgreyling"
  echo "  Or: export NPM_TOKEN=npm_...  # Classic Automation token (bypasses 2FA in CI)"
  exit 1
fi

echo "npm user: $(npm whoami)"
echo ""

echo "=== build + test ==="
pnpm install --frozen-lockfile
pnpm build
pnpm test

echo ""
echo "=== publish all @cobusgreyling/harness-foundry* packages ==="
if [[ -n "${NPM_OTP:-}" ]]; then
  pnpm changeset publish --otp "$NPM_OTP"
else
  pnpm changeset publish
fi

echo ""
echo "=== verify ==="
npm view @cobusgreyling/harness-foundry version
npx --yes @cobusgreyling/harness-foundry@latest init --help | head -5
pnpm smoke

echo ""
echo "Done. Update CI secret for future releases:"
echo "  bash scripts/setup-npm-github-secret.sh"