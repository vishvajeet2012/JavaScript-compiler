# JS Compiler — Admin

Vite + React admin for **JS Compiler** (license keys, plans, usage, crashes, download stats).

Full product overview: **[../README.md](../README.md)**

## Features

- Pricing plans (price, duration, max devices, one-time)
- Generate / list / revoke license keys
- Device activation & protection controls
- Usage analytics & crash reports
- Optional download stats from Next.js (`/api/download/stats`)

## Run

```bash
# 1) API
cd ../server
npm run dev

# 2) Admin UI
cd ../admin
npm run dev
```

Open **http://localhost:5173**

Set `ADMIN_SECRET` on the server. Default local password is often `admin123` (change in production).

## Env

```bash
# admin/.env
VITE_API_URL=https://java-script-server.vercel.app
# optional: Next site for download stats
VITE_NEXT_APP_URL=https://jsplay-kappa.vercel.app
```

## Electron activation

Desktop app uses production API:

- `POST /api/activate`
- `POST /api/verify`

Keys created here power Pro on the desktop app.
