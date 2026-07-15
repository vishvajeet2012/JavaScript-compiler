# Promo free keys (generated)

**Do not commit secrets long-term if this file is public** — keys are licenses.  
Generated for launch promo. Valid in MongoDB.

| Field | Value |
|--------|--------|
| Plan | `PROMO_FREE` |
| Key expires | **1 January 2028** |
| Website popup until | ~**13 September 2026** (2 months from generate) |
| Promo code | `WEB_FREE_2M` |

## Keys (activate in desktop app)

```
PROMO-BR6X-W3CH-24MV
PROMO-YR26-RK5W-UR4X
PROMO-2QDB-HAXV-DURD
PROMO-RBZX-23ZH-ULNM
PROMO-YXBX-RNQ4-ZTTT
PROMO-6NTH-JBTU-Z552
PROMO-VCJC-VGW9-HG7A
PROMO-PPKD-U9YQ-6P4N
PROMO-KGVP-URU2-NLG5
PROMO-85TN-7JEG-CANF
PROMO-947S-B6AG-L3JZ
PROMO-T4TB-KGP4-KAFN
```

## How users use

1. Website popup → Copy key  
2. Desktop → **Activate Pro** → paste key  

## Regenerate

```bash
cd server
node scripts/generate-promo-keys.js
```

## Server / activation URL (hardcoded fallback)

```
https://java-script-server.vercel.app
```

- Desktop: `electron/activation.js` → `DEFAULT_SERVER`  
- Next.js: `FALLBACK_API_URL` + `FALLBACK_PROMO` in `next-app/src/lib/fallback.js`  
