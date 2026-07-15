# JS Compiler v1.0.1

**Release date:** 2026-07-15  
**Tag:** `v1.0.1`

## What's new

- Production activation server locked (no localhost / hidden server URL in Settings)
- Improved in-app auto-update (GitHub Releases feed, clearer status & errors)
- App logo in titlebar (brand icon)
- Website: multi-platform downloads (Windows, Linux AppImage/deb, macOS Intel + Apple Silicon)
- Website: `/jsplay` free online playground (loop auto-pause + localStorage)
- Website: `/api/download?platform=…` resolves **latest** GitHub release assets
- Download section no longer stuck on a single hardcoded Windows 1.0.0 link

## Installers (after CI publish)

| Platform | File pattern |
|----------|----------------|
| Windows x64 | `JS-Compiler-Setup-1.0.1.exe` |
| Linux | `JS-Compiler-1.0.1.AppImage`, `JS-Compiler-1.0.1.deb` |
| macOS | `JS-Compiler-1.0.1-arm64.dmg`, `JS-Compiler-1.0.1-x64.dmg` |

## How this release is produced

1. `package.json` version = `1.0.1`
2. Push tag `v1.0.1` → GitHub Actions `.github/workflows/release.yml`
3. CI builds Win / Linux / mac and publishes to GitHub Releases
4. Landing page + `/api/download` pick up latest assets automatically

## Notes

- In-app auto-update: install any previous build, then **Settings → Check for updates**
- Code signing optional (`CSC_LINK`) — unsigned builds still publish and update
- R2 private Windows host is optional; site defaults to GitHub latest for all OS
