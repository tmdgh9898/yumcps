# Production Data Load (API Batch Upload)

## 1) Preconditions
- Render API prod URL is live (returns `success=true` on `/healthz`)
- Vercel prod is connected to the prod API URL
- Local checks passed:
  - `npm run check:utf8`
  - `npm run build`

## 2) Full upload (2025 + 2026 folders)
```bash
npm run upload:bulk:api -- --base=https://yumcps-api-prod.onrender.com --batch-size=30 --retry-failed
```

Optional explicit folders:
```bash
npm run upload:bulk:api -- --base=https://yumcps-api-prod.onrender.com --dirs="D:\monthlyreport\2025 당직일지,D:\monthlyreport\2026 당직일지" --batch-size=30 --retry-failed
```

The script writes a report JSON under `reports/`.

## 3) API readiness verification
```bash
npm run verify:prod:api -- --base=https://yumcps-api-prod.onrender.com
```

## 4) DB summary verification
```bash
DATABASE_URL=<prod_database_url> npm run verify:data > verify-prod.json
```

## 5) Manual checks
- Dashboard values are non-zero for loaded months
- Export download works (`/api/export/:month`)
- Korean text is not broken in API responses and exported files
- Error logs are stable in Render dashboard

