@AGENTS.md

Also read **repository root** rules (mandatory):

- `../AGENTS.md` — CHANGE → VERSION → RELEASE → PUSH (strict)
- `../CLAUDE.md` — short summary for Claude/agents

### Non-negotiable

- User-facing Next.js changes → **push `main`**
- You **decide** version when shipping a product release
- Desktop binary updates need **git tag `vX.Y.Z`** (not only website push)
- Never commit `.env.local` / secrets
