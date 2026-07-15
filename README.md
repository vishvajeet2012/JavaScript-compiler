# JS Compiler

**Desktop JavaScript compiler** — write, run, and save code offline.  
Built for students, freelancers, and developers who want a focused desktop workspace (not another browser tab).

| | |
|--|--|
| **Product** | JS Compiler (Electron desktop app) |
| **Latest release** | [GitHub Releases](https://github.com/vishvajeet2012/JavaScript-compiler/releases/latest) |
| **Website** | [jsplay-kappa.vercel.app](https://jsplay-kappa.vercel.app) |
| **Online playground** | [jsplay-kappa.vercel.app/jsplay](https://jsplay-kappa.vercel.app/jsplay) |
| **Publisher** | [vishvajeetshukla.in](https://vishvajeetshukla.in) |
| **Author** | Vishvajeet Shukla |
| **License** | MIT |

---

## What is JS Compiler?

JS Compiler is a **native desktop app** for:

- Writing and running **JavaScript** (plus TypeScript-stripped, HTML+JS, Node-style snippets)
- Saving snippets in a **local SQLite** database (your code stays on your machine)
- Organizing work with **folders** and **templates**
- **Pro** features: version history, higher limits, multi-device license keys
- **Silent auto-update** from GitHub Releases (no need to re-download from the website every time)
- Optional **crash reports** and **usage telemetry** for product improvement (admin-visible)

It is **not** a full IDE replacement for VS Code — it is a fast, focused **snippet / run / save** compiler for daily practice and small tools.

---

## Platforms

Installers are published on every version tag (`vX.Y.Z`) via GitHub Actions:

| Platform | Package |
|----------|---------|
| **Windows** x64 | `JS-Compiler-Setup-X.Y.Z.exe` (NSIS) |
| **Linux** x64 | `.AppImage` and `.deb` |
| **macOS** | DMG for **Apple Silicon** (`arm64`) and **Intel** (`x64`) |

Download page (always resolves **latest** release assets):

- Website: https://jsplay-kappa.vercel.app/#download  
- API: `https://jsplay-kappa.vercel.app/api/download?platform=windows|linux|linux-deb|mac-arm64|mac-x64`  
- Releases: https://github.com/vishvajeet2012/JavaScript-compiler/releases  

---

## Features

### Free
- Run JS in a sandboxed worker with **timeout / infinite-loop auto-pause**
- Local snippet storage (SQLite)
- Folders & basic workspace
- Theme / auto-save settings
- In-app **Check for updates**

### Pro (license key)
- Higher snippet limits
- **Version history** (snapshots on save)
- Multi-device plans (Trial / Student / Team style keys via admin)
- Activation against production API

### Website extras
- Landing, pricing, contact
- Multi-OS download cards
- **JS Play** — free browser playground (`/jsplay`) with loop auto-pause + `localStorage` code restore

---

## Repository layout

```text
JavaScript-compiler/
├── javascript-compiler/   # Electron desktop app (main product)
├── next-app/              # Next.js website + downloads + /jsplay
├── server/                # Express API (activation, plans, admin, landing JSON)
├── admin/                 # Vite admin panel (keys, plans, stats)
├── AGENTS.md              # Strict agent rules (version / release / push)
├── CLAUDE.md              # Short agent summary
└── README.md              # This file
```

---

## Live URLs

| Service | URL |
|---------|-----|
| Website (Next.js) | https://jsplay-kappa.vercel.app |
| JS Play playground | https://jsplay-kappa.vercel.app/jsplay |
| API / activation | https://java-script-server.vercel.app |
| GitHub | https://github.com/vishvajeet2012/JavaScript-compiler |

---

## Quick start (developers)

### Desktop app

```bash
cd javascript-compiler
npm.cmd install
npm.cmd run dev          # development
npm.cmd run build:win    # Windows installer → dist/
```

Requires Node.js 20+ recommended. Native module: `better-sqlite3`.

### Website

```bash
cd next-app
npm.cmd install
npm.cmd run dev          # http://localhost:3000
```

### API server

```bash
cd server
npm.cmd install
# configure .env (MongoDB, ADMIN_SECRET, etc.)
npm.cmd run dev          # http://localhost:5000
```

### Admin

```bash
cd admin
npm.cmd install
npm.cmd run dev          # http://localhost:5173
```

---

## Releases & versioning

1. Bump `javascript-compiler/package.json` → `"version": "X.Y.Z"`
2. Commit & push `main`
3. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`
4. GitHub Actions workflow **Release Desktop App** builds Win / Linux / mac and publishes assets
5. Website download API reads **GitHub latest** automatically

See:

- `javascript-compiler/SIGNING.md` — code signing notes  
- `javascript-compiler/RELEASE_NOTES_1.0.1.md` — example release notes  
- `AGENTS.md` — mandatory agent release rules  

**Important:** Changing code without a new **git tag** does not change the installer users download. Latest published release wins.

---

## Activation (high level)

Desktop app talks to the production API:

- `POST /api/activate` — activate license key + machine id  
- `POST /api/verify` — re-check license  

Admin generates keys from plans (duration, max devices, etc.).  
Settings UI does **not** expose a custom activation server URL (always production).

---

## Stack

| Layer | Tech |
|-------|------|
| Desktop | Electron, better-sqlite3, electron-updater, Monaco (renderer) |
| Website | Next.js 16, React 19 |
| API | Node.js, Express, MongoDB |
| Admin | Vite + React |
| CI | GitHub Actions (multi-OS electron-builder) |
| Hosting | Vercel (site + API), GitHub Releases (installers), optional Cloudflare R2 |

---

## Privacy (product stance)

- Snippets and projects are stored **locally** on the user’s machine by default  
- Activation / updates / optional telemetry need network when used  
- Pro does not move your local library to a required cloud IDE  

---

## Support & contact

- Site contact form: https://jsplay-kappa.vercel.app (Contact section)  
- Publisher: https://vishvajeetshukla.in  
- Issues: use this GitHub repository  

---

## License

MIT — see package metadata and repository license if present.
