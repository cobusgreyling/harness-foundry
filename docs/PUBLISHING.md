# Publishing to npm

Packages publish under `@cobusgreyling/harness-foundry*`.

## Local

```bash
pnpm build && pnpm test
NPM_OTP=123456 pnpm changeset publish  # if 2FA enabled
```

## CI

Set `NPM_TOKEN` (Classic → Automation) on the GitHub repo. Pushes to `main` run [release.yml](../.github/workflows/release.yml) via Changesets.

See [outerloop publishing](https://github.com/cobusgreyling/outerloop/blob/main/docs/PUBLISHING.md) for token setup.