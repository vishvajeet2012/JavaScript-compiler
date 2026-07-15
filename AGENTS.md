# JS Compiler — Agent Rules (STRICT)

These rules are **mandatory** for every agent (Grok, Claude, Cursor, Copilot, etc.) working in this repository.

---

## 0. Scope

This monorepo ships:

| Path | Product |
|------|---------|
| `javascript-compiler/` | Desktop Electron app (Windows / Linux / macOS) |
| `next-app/` | Marketing site + downloads + `/jsplay` (Vercel) |
| `server/` | Express API / activation (Vercel) |
| `admin/` | Admin panel |

---

## 1. CHANGE → RELEASE → PUSH (NON-NEGOTIABLE)

### Rule R1 — Any shipping change must be released

When you change code that affects users (desktop app, website, API, downloads, activation, admin):

1. **Finish the change**
2. **Decide the next version** (you decide — see §2)
3. **Bump version** in the right package(s)
4. **Commit** with a clear message
5. **Push `main`** to `origin`
6. **If desktop app code changed** → create & push git tag `vX.Y.Z` so GitHub Actions publishes installers
7. **Verify** release / deploy is not left half-done

**Do not** leave shipping fixes only in the working tree.  
**Do not** say “user can release later” for user-facing fixes unless the user **explicitly** says: “do not release / do not push / do not tag”.

### Rule R2 — User said “fix / change / update” = you own ship path

Default end state after a task:

- Code on `origin/main`
- Version bumped when product behavior changed
- Desktop: tag pushed if `javascript-compiler/` changed in a user-visible way
- Website/API: push is enough for Vercel; still bump desktop version if the change is part of a coordinated product release

### Rule R3 — Explicit overrides only

Skip release/tag **only** if the user clearly says one of:

- `no release` / `mat release` / `don't release`
- `no push` / `mat push`
- `local only` / `sirf local`

Otherwise for **shipping product code**: **release + push**.

### Rule R4 — Do not commit/push unless the task implies ship (STRICT)

**Never** create a git commit or push just because you edited docs/rules/README.

| User said | Commit? | Push? | Tag? |
|-----------|---------|-------|------|
| “rules bana” / “README update” / “docs” only | **No** (unless they also say commit/push) | No | No |
| “fix bug / feature / release / push / ship” | Yes | Yes | Desktop yes |
| “commit kar” / “push kar” | Yes (what they asked) | If they said push | Only if release needed |

If you only update `AGENTS.md`, `CLAUDE.md`, or `README.md`, **leave changes uncommitted** until the user asks to commit/push.

---

## 2. VERSIONING (AGENT DECIDES)

### Rule V1 — You choose the version number

Do **not** wait for the user to invent a version. Use **semver** on:

`javascript-compiler/package.json` → `"version"`

Also keep `javascript-compiler/package-lock.json` root version in sync.

### Rule V2 — How to pick the bump

| Change type | Bump | Example |
|-------------|------|---------|
| Bugfix, small UI copy, config, download link fix | **PATCH** | `1.0.1` → `1.0.2` |
| New feature (playground, new download OS card, settings UX) | **MINOR** | `1.0.2` → `1.1.0` |
| Breaking change (activation protocol break, DB wipe, major UX break) | **MAJOR** | `1.1.0` → `2.0.0` |

If unsure → **PATCH**.

### Rule V3 — Never ship installers with a stale version

- After bumping to `X.Y.Z`, tag must be exactly **`vX.Y.Z`** (example: version `1.0.2` → tag `v1.0.2`).
- Do not retag / force-move existing tags.
- Do not publish two different products under the same version.

### Rule V4 — Website “latest” downloads

The Next.js site resolves installers from **GitHub Releases latest**.

So after a desktop release:

1. Tag `vX.Y.Z` must be pushed
2. Actions workflow **Release Desktop App** must run
3. Only then will `/api/download` and the download UI show the new files

If you only bump package.json without tagging, users still get the **old** installer. That is a **rule violation**.

### Rule V5 — Public What’s New / Changelog (STRICT — every release)

The website has a **public changelog** at:

- `/changelog` — What’s New (Added / Fixed / Changed / Removed)
- `/docs` — docs hub linking to changelog + Free vs Pro

**On EVERY desktop release `vX.Y.Z` you MUST update the public What’s New surface.** A release is incomplete without this.

Required steps (all of them):

1. **Admin / Mongo managed release** (preferred):
   - Create or update release `X.Y.Z` with structured fields:
     - `added[]`, `fixed[]`, `changed[]`, `removed[]` (and optional `changelog[]`, `notes`)
   - Set **`isHome: true`** for the new version; mark previous home as **`isOutdated: true`**
   - Platform download URLs for Win / Linux / mac when installers exist
   - Use seed script pattern: `server/scripts/seed-release-X.Y.Z.js` (run after tag)

2. **Static fallback file** (mandatory backup when API empty):
   - Update `next-app/src/lib/changelog-fallback.js`
   - Put the new version **at the top** of `CHANGELOG_FALLBACK` with the same Added/Fixed/Changed/Removed
   - Keep at least the last 3 versions in the fallback list

3. **Desktop notes file** (preferred):
   - `javascript-compiler/RELEASE_NOTES_X.Y.Z.md` matching the same bullets

4. **Verify after deploy**:
   - Open `/changelog` — new version visible with structured sections
   - Home download / What’s New not stuck on an older version only

**Do not ship a tag without changelog content.**  
If Admin seed cannot run, still update `changelog-fallback.js` before/with the release commit.

---

## 3. RELEASE PROCEDURE (STRICT CHECKLIST)

Copy this checklist and complete every line that applies.

### 3.1 Always (any shipping change)

- [ ] Implement + test the change
- [ ] `git status` clean of secrets (never commit `.env.local`, keys, tokens)
- [ ] Commit with complete sentences
- [ ] `git push origin main`

### 3.2 Desktop app changed (`javascript-compiler/**`)

- [ ] Bump `javascript-compiler/package.json` version (agent decides)
- [ ] Sync lockfile package version if needed
- [ ] Add/update `javascript-compiler/RELEASE_NOTES_X.Y.Z.md`
- [ ] **Update public What’s New** (Rule V5):
  - [ ] `next-app/src/lib/changelog-fallback.js` (new version on top)
  - [ ] Seed/Admin release with `added` / `fixed` / `changed` / `removed` + `isHome`
  - [ ] Optional: `server/scripts/seed-release-X.Y.Z.js`
- [ ] Commit version bump (can be same commit as the feature)
- [ ] `git push origin main`
- [ ] `git tag -a vX.Y.Z -m "JS Compiler vX.Y.Z"`
- [ ] `git push origin vX.Y.Z`
- [ ] Confirm Actions: `.github/workflows/release.yml` started for that tag
- [ ] Confirm `/changelog` shows vX.Y.Z after deploy

### 3.3 Website only (`next-app/**`) and/or API only (`server/**`)

- [ ] Push `main` (Vercel deploys)
- [ ] If download/release messaging depends on a new desktop build, also do §3.2
- [ ] Do **not** invent fake desktop versions on the site — GitHub latest is source of truth

### 3.4 Admin only (`admin/**`)

- [ ] Push `main`
- [ ] Desktop tag only if admin change requires a matching app protocol release

---

## 4. GIT / SECRETS (STRICT)

### Rule G1 — Never commit secrets

Forbidden in git:

- `.env`, `.env.local`, R2 keys, `cfat_` tokens, admin passwords, `GH_TOKEN`, private certs

### Rule G2 — Push is required after ship work

Unless user forbade push: after commit, **push**.

### Rule G3 — No force-push to `main` / no rewriting published tags

Unless user explicitly orders recovery and understands the risk.

### Rule G4 — Commit messages

Use clear, complete sentences. State **what** and **why**, not only file names.

---

## 5. PRODUCT-SPECIFIC RULES

### Desktop (`javascript-compiler`)

- Activation server is **production only** — never re-expose localhost URL in Settings UI
- Auto-update uses **GitHub Releases** (`electron-updater`) — requires real published tags
- Artifact names: space-free (`JS-Compiler-Setup-${version}.exe`)

### Next.js (`next-app`)

- Downloads: `/api/download?platform=windows|linux|linux-deb|mac-arm64|mac-x64`
- Platforms shown: **Windows + Linux + macOS** (not Windows-only)
- Prefer GitHub **latest** assets so version is never stuck on an old hardcoded build
- `/jsplay` playground: infinite loop auto-pause + `localStorage` persistence
- Read `next-app/AGENTS.md` for Next.js 16-specific notes

### Server (`server`)

- Public activation base: `https://java-script-server.vercel.app`
- Keep CORS in sync with Next.js production host(s)

---

## 6. DEFINITION OF DONE

A task is **not done** until:

1. Code is on `origin/main`, and  
2. Version is correct for the change class, and  
3. If desktop changed: **tag pushed** (or user explicitly waived release), and  
4. You told the user: version number, push status, and release/Actions link when tagged  

---

## 7. QUICK COMMANDS (reference)

```bash
# after version bump to X.Y.Z
git add -A
git commit -m "Describe change. Ship vX.Y.Z."
git push origin main

# desktop release
git tag -a vX.Y.Z -m "JS Compiler vX.Y.Z"
git push origin vX.Y.Z
```

Actions workflow: `.github/workflows/release.yml` (on tags `v*`).

---

## 8. PRIORITY ORDER

If instructions conflict:

1. **User explicit override** for this turn (`no push` / `no release`)  
2. **This file (`AGENTS.md`)**  
3. Package-local AGENTS/CLAUDE  
4. General style preferences  

**Default bias: ship. Version. Push. Tag when desktop changes.**
