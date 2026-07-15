# JS Compiler — Website (Next.js)

Marketing site, multi-platform **downloads**, and free **JS Play** playground for [JS Compiler](https://github.com/vishvajeet2012/JavaScript-compiler).

## Live

| | |
|--|--|
| Home | https://jsplay-kappa.vercel.app |
| Downloads | https://jsplay-kappa.vercel.app/#download |
| JS Play | https://jsplay-kappa.vercel.app/jsplay |
| Download API | `/api/download?platform=windows\|linux\|linux-deb\|mac-arm64\|mac-x64` |

## About the product (short)

**JS Compiler** is a desktop app (Windows / Linux / macOS) to write, run, and save JavaScript offline with folders, local DB, Pro activation, and in-app auto-update.

This Next.js app is the **public face**:

- Landing, features, pricing, contact  
- Download cards for **all OS** (assets from **GitHub Releases latest**)  
- `/jsplay` — browser playground (timeout auto-pause + localStorage)  

Full product docs: **[../README.md](../README.md)**

## Local dev

```bash
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000

## Important env (optional)

Copy `.env.example` → `.env.local`.

- `NEXT_PUBLIC_API_URL` — Express API (landing/health/contact)  
- `R2_*` — optional private Windows host (default downloads use GitHub latest)  
- Never commit secrets  

## Agent rules

Follow repo root **`AGENTS.md`** / **`CLAUDE.md`**.  
This folder’s `AGENTS.md` also has Next.js 16 notes.

## Scripts

```bash
npm.cmd run dev
npm.cmd run build
npm.cmd run start
npm.cmd run lint
```
