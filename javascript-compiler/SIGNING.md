# Windows Code Signing

SmartScreen warnings drop when the installer is signed with a trusted certificate.

## Option A — `.pfx` file (recommended for local)

```powershell
# Path to your code-signing certificate
$env:CSC_LINK = "C:\path\to\certificate.pfx"
$env:CSC_KEY_PASSWORD = "your-pfx-password"

cd javascript-compiler
npm.cmd run publish:win
```

## Option B — Base64 cert (CI / GitHub Actions)

```powershell
$env:CSC_LINK = "<base64-encoded-pfx>"
$env:CSC_KEY_PASSWORD = "your-pfx-password"
npm.cmd run publish:win
```

## Notes

- Buy an **EV or OV Code Signing** cert (DigiCert, Sectigo, SSL.com).
- Without `CSC_LINK`, build still works but is **unsigned**.
- `electron-builder` uses SHA-256 + DigiCert timestamp servers (configured in `package.json`).
- After first signed release, auto-update still works via GitHub Releases (`latest.yml`).

## Publish checklist

1. Bump `version` in `package.json` (e.g. `1.0.0` → `1.0.1`)
2. Commit & push `main`
3. Create & push tag: `git tag v1.0.1` then `git push origin v1.0.1`
4. GitHub Actions **Release Desktop App** builds Win/Linux/mac and publishes the release
5. Optional local publish: set `GH_TOKEN` + `npm.cmd run publish:win`
6. Signing env vars (`CSC_LINK`) optional but recommended for SmartScreen

See also: `RELEASE_NOTES_1.0.1.md`
