# Claude / coding agents — read this first

@AGENTS.md

## Strict summary (must follow)

1. **Any user-facing code change → commit + push `main`.**
2. **You decide the version** (semver). Do not wait for the user to invent `1.0.x`.
3. **Desktop app changes (`javascript-compiler/`) → bump `package.json` + push tag `vX.Y.Z`** so GitHub Actions builds Win/Linux/mac installers.
4. **Website downloads always follow GitHub latest** — without a tag, users keep getting the old installer.
5. **Never commit secrets** (`.env.local`, R2 keys, tokens).
6. Skip release/push **only** if the user explicitly says not to.

Full rules, checklist, and version policy: **`AGENTS.md`**.
