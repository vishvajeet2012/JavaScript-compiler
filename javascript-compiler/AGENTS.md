# Desktop app agent rules

**Root law (mandatory):** `../AGENTS.md`

## Desktop-specific STRICT rules

1. Any user-visible change here → **bump `package.json` version** (agent decides semver).
2. Sync root version in `package-lock.json`.
3. Commit + push `main`.
4. **Tag and push `vX.Y.Z`** to trigger `.github/workflows/release.yml` (Win/Linux/mac installers).
5. Without the tag, website “latest download” stays on the **previous** release — that is a failure.
6. Do not re-add Activation Server URL to Settings UI.
7. Auto-update depends on published GitHub Releases — ship real tags.

## Version decision

- Patch: fixes / polish  
- Minor: features  
- Major: breaking  

If unsure → patch.
