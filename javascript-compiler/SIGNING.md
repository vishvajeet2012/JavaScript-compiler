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
2. Set `GH_TOKEN` with `repo` scope
3. Set signing env vars (optional but recommended)
4. `npm.cmd run publish:win`
