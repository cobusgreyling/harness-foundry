# Publishing to npm

Packages publish under `@cobusgreyling/harness-foundry*`.

## Token requirements

Publishing requires a token that **bypasses 2FA**:

| Token type | CI publish | Local publish |
|------------|------------|---------------|
| **Classic → Automation** | ✅ | ✅ |
| Granular / Publish | ❌ EOTP | Needs `NPM_OTP` |
| Read-only | ❌ | ❌ |

Create at [npmjs.com → Access Tokens](https://www.npmjs.com/settings/tokens) → **Classic** → **Automation**.

## GitHub secret

```bash
gh secret set NPM_TOKEN --repo cobusgreyling/harness-foundry
# paste Automation token when prompted — never commit or chat-share tokens
```

The [release workflow](../.github/workflows/release.yml) uses this on pushes to `main`.

## Local publish

```bash
pnpm build && pnpm test
pnpm changeset publish
```

If your account has 2FA and you are not using an Automation token:

```bash
NPM_OTP=123456 pnpm changeset publish
```

## Verify

```bash
npm view @cobusgreyling/harness-foundry version
npx @cobusgreyling/harness-foundry init --help
```

## First publish order

Changesets publishes all bumped packages. Workspace deps resolve automatically. Run `pnpm smoke` after publish to verify the packed CLI.