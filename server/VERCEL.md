# Deploy Express API on Vercel

## 1. Push code (repo root)

```bash
git push origin main
```

## 2. New Vercel project for **server**

1. [vercel.com/new](https://vercel.com/new) → import `vishvajeet2012/JavaScript-compiler`
2. **Root Directory** → `server` (Important!)
3. Framework Preset → **Other**
4. Build Command → leave empty  
5. Output Directory → leave empty  
6. Install Command → `npm install`

## 3. Environment variables (Vercel → Settings → Env)

| Name | Value |
|------|--------|
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://jsplay-kappa.vercel.app,http://localhost:3000,http://localhost:5173` |
| `MONGODB_URI` | your Atlas connection string |
| `ADMIN_SECRET` | strong password |
| `ACTIVATION_SECRET` | random long string |
| `RATE_LIMIT_MAX` | `200` |

## 4. MongoDB Atlas

Network Access → allow `0.0.0.0/0` (Vercel dynamic IPs)

## 5. After deploy

Note your API URL, e.g.:

```text
https://YOUR-API.vercel.app
```

Health check:

```text
https://YOUR-API.vercel.app/api/v1/health
```

## 6. Point Next.js frontend (`jsplay-kappa`) to API

In the **frontend** Vercel project (`jsplay-kappa`):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-API.vercel.app` |

Redeploy frontend after setting env.

## 7. Electron / Admin

- Electron activation server URL → `https://YOUR-API.vercel.app`
- Admin `.env`: `VITE_API_URL=https://YOUR-API.vercel.app`

## Local still works

```bash
cd server
npm run dev
# http://localhost:5000
```
