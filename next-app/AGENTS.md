<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Next.js app rules + monorepo release law

## MUST READ (repo root)

**Follow `../AGENTS.md` strictly.**  
That file is the law for: version bumps, releases, tags, and git push.

## Next.js–specific (this package)

| Topic | Rule |
|-------|------|
| Downloads | Show **Windows + Linux + macOS**; use `/api/download?platform=…` |
| Version on site | From **GitHub Releases latest** (`src/lib/releases.js`) — never hardcode old `1.0.0` forever |
| `/jsplay` | Playground with loop auto-pause + localStorage |
| R2 | Optional private Windows host; default path is GitHub latest |
| Env secrets | `.env.local` only — never commit R2 keys |

## After any change in `next-app/`

1. Commit + **push `main`** (Vercel deploy)
2. If desktop installers / version must change too → do desktop version + tag per root `AGENTS.md`
3. Agent decides version when a coordinated product release is needed

## Claude

See `CLAUDE.md` in this folder (includes root rules pointer).
