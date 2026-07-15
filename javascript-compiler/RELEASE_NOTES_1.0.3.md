# JS Compiler v1.0.3

## Fixed
- Promo / activation keys with `PROMO-` prefix no longer show “Invalid activation key” (hyphen formatting)
- Free plan cannot run TypeScript, HTML+JS, or Node (Pro-only, enforced in UI + main process)
- Website promo “Claim free key” CORS / failed-to-fetch issues (API headers)

## Changed
- Single free 7-day trial plan (`TRIAL_7D`); removed duplicate paid/free ONETIME trial
- Trial price remains free (₹0)

## Added
- (from 1.0.2 baseline) Admin banner, What’s New, update notes structure
