# JS Compiler Admin

Vite + React admin panel for **pricing plans** and **license key generation**.

## Features

- Pricing plans (price, duration/expiry, max devices, one-time flag)
- Generate keys from a plan (bulk, custom expiry, device override)
- List / search / revoke / delete keys
- Device activation tracking (for Electron app)
- Simple password login (`ADMIN_SECRET`)

## Run

```bash
# 1) Start API (from /server) — needs MongoDB Atlas network access
cd ../server
npm run dev

# 2) Start admin UI
cd ../admin
npm run dev
```

Open **http://localhost:5173**

Default password: `admin123` (set `ADMIN_SECRET` in `server/.env`)

## Electron activation

Desktop app calls:

- `POST http://localhost:5000/api/activate`
- `POST http://localhost:5000/api/verify`

Keys generated here work with the Electron Pro activation flow.
