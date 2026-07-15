# Windows / macOS Code Signing (SmartScreen)

Unsigned installers work, but Windows **SmartScreen** and macOS Gatekeeper warn users.  
Signing is optional for CI; enable secrets when you have a certificate.

## Status in this repo

| Item | Default |
|------|---------|
| CI Windows build | Unsigned (`CSC_IDENTITY_AUTO_DISCOVERY=false` unless secrets set) |
| CI macOS build | Unsigned unless Apple cert secrets set |
| `package.json` win.signAndEditExecutable | `true` when `CSC_LINK` present (see below) |
| Auto-update | Works with unsigned builds (`verifyUpdateCodeSignature: false`) |

## GitHub Actions secrets (recommended)

Repo → **Settings → Secrets and variables → Actions**

### Windows (Authenticode)

| Secret | Description |
|--------|-------------|
| `CSC_LINK` | Base64 of `.pfx` **or** path-compatible base64 blob of the cert |
| `CSC_KEY_PASSWORD` | PFX password |

Workflow already passes through env when present (see `release.yml`).

### Encode PFX to base64 (PowerShell)

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\cert.pfx")) | Set-Clipboard
```

Paste into GitHub secret `CSC_LINK`.

### macOS (optional)

| Secret | Description |
|--------|-------------|
| `CSC_LINK` | Developer ID Application cert (p12 base64) |
| `CSC_KEY_PASSWORD` | Cert password |
| `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` | Notarization (optional advanced) |

## Local signed Windows build

```powershell
$env:CSC_LINK = "C:\path\to\certificate.pfx"
$env:CSC_KEY_PASSWORD = "your-pfx-password"
cd javascript-compiler
npm.cmd run build:win:signed
```

Or publish:

```powershell
$env:GH_TOKEN = "<github token with repo scope>"
npm.cmd run publish:win
```

## Certificate types

1. **OV Code Signing** — organization validated; SmartScreen reputation builds over time  
2. **EV Code Signing** — immediate reputation (USB/HSM often required)  
3. Buy from DigiCert, Sectigo, SSL.com, etc.

## After first signed release

- Auto-update still uses GitHub Releases (`latest.yml`)
- Prefer keeping **same `appId`**: `com.vishvajeetshukla.javascript-compiler`
- Do not change publisher name lightly after users install signed builds

## Checklist for a signed vX.Y.Z

1. Cert secrets on GitHub (or local env)
2. Bump version in `package.json`
3. Tag `vX.Y.Z` and push
4. Confirm Actions logs show “signing” without errors
5. Download Setup exe and verify Digital Signatures in Windows Properties

## Without a certificate (current)

Builds still publish. Users may see “Windows protected your PC” → **More info → Run anyway**.  
That is expected for unsigned software.
