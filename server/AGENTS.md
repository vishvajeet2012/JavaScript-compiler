# API server agent rules

**Root law (mandatory):** `../AGENTS.md`

## Server-specific

1. User-facing API / activation / landing content changes → commit + **push `main`** (Vercel).
2. If landing download links or activation contract change with the desktop app → coordinate desktop **version + tag** per root rules.
3. Never commit `.env` secrets.
4. Production activation base remains the configured Vercel API URL.
