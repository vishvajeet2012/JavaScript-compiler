# Deploy Express API on Vercel

Root of this folder is the Vercel project. Entry: `api/index.js` → Express app + MongoDB.

## 1. Push code (repo root)

```bash
git add -A
git commit -m "Your message"
git push origin main
```

## 2. Create / link Vercel project

1. [vercel.com/new](https://vercel.com/new) → import `vishvajeet2012/JavaScript-compiler`
2. **Root Directory** → `server` ⚠️ required
3. Framework Preset → **Other**
4. Build Command → leave empty  
5. Output Directory → leave empty  
6. Install Command → `npm install`
7. Deploy

### CLI (optional)

```bash
cd server
npx vercel login
npx vercel          # preview
npx vercel --prod   # production
```

## 3. Environment variables (Vercel → Settings → Environment Variables)

Add for **Production** (and Preview if you want):

| Name | Example / notes |
|------|------------------|
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://jsplay-kappa.vercel.app,https://vishvajeetshukla.in,http://localhost:3000,http://localhost:5173` |
| `MONGODB_URI` | Atlas URI (`js-compiler` DB) |
| `ADMIN_SECRET` | Strong admin password |
| `ACTIVATION_SECRET` | Long random string |
| `RATE_LIMIT_MAX` | `200` |

After changing env → **Redeploy**.

## 4. MongoDB Atlas

- Network Access → allow `0.0.0.0/0` (Vercel dynamic IPs)
- Database user with read/write on `js-compiler`

## 5. Verify deploy

```text
https://YOUR-API.vercel.app/api/v1/health
https://YOUR-API.vercel.app/api/v1/plans
https://YOUR-API.vercel.app/api/activate   (POST from Electron)
```

Health should return JSON `success: true`.

## 6. Wire other apps

| App | Setting |
|-----|---------|
| Next.js (`jsplay-kappa`) | `NEXT_PUBLIC_API_URL=https://java-script-server.vercel.app` |
| Admin Vite | `VITE_API_URL=https://java-script-server.vercel.app` |
| Electron | Activation server URL = `https://java-script-server.vercel.app` |

Production API (default fallback in code):

```text
https://java-script-server.vercel.app
```

## 7. Admin seed after first deploy

1. Open admin panel → login with `ADMIN_SECRET`
2. Dashboard → **Sync missing plans** (Trial / Student / Team)

## Local still works

```bash
cd server
cp .env.example .env   # fill values
npm run dev
# http://localhost:5000
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 503 Database unavailable | Check `MONGODB_URI` + Atlas Network Access |
| CORS errors | Add frontend origin to `CORS_ORIGIN` |
| 404 on routes | Confirm Root Directory is `server` |
| Cold start slow | Normal on free tier; first request warms Mongo |
