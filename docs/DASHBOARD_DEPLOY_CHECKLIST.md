# Manual Dashboard Deployment Checklist (Render + Vercel)

## Security first
- Revoke exposed key in Render > API Keys.
- Create a new key and keep it out of chat/history.

## Staging deploy
### Render (API + DB)
1. New Postgres:
   - Name: `yumcps-db-stg`
2. New Web Service:
   - Name: `yumcps-api-stg`
   - Repo: `tmdgh9898/yumcps`
   - Branch: `staging`
   - Build: `npm ci`
   - Start: `npm run start`
3. Environment Variables:
   - `DATABASE_URL`: from `yumcps-db-stg`
   - `PGSSL=true`
   - `CORS_ORIGINS=https://yumcps-web-stg.vercel.app,http://localhost:3000`
4. Verify:
   - `GET /healthz` returns `success=true`

### Vercel (Web)
1. Import repo `tmdgh9898/yumcps`
2. Project name: `yumcps-web-stg`
3. Production branch: `staging`
4. Environment Variable:
   - `VITE_API_BASE_URL=https://yumcps-api-stg.onrender.com`
5. Deploy and open app

## Staging rehearsal
- Upload 5-10 sample xlsx logs
- Validate endpoints and UI
- Run smoke:
  - `npm run smoke:api -- --base=https://yumcps-api-stg.onrender.com --file="<sample.xlsx>"`

## Production deploy
### Render
1. New Postgres: `yumcps-db-prod`
2. New Web Service: `yumcps-api-prod` (branch `main`)
3. Env vars:
   - `DATABASE_URL` from prod DB
   - `PGSSL=true`
   - `CORS_ORIGINS=https://yumcps-web-prod.vercel.app,http://localhost:3000`

### Vercel
1. Project name: `yumcps-web-prod`
2. Production branch: `main`
3. Env:
   - `VITE_API_BASE_URL=https://yumcps-api-prod.onrender.com`

## Post-cutover checks
- One-file smoke on prod:
  - `npm run smoke:api -- --base=https://yumcps-api-prod.onrender.com --file="<sample.xlsx>"`
- Bulk import:
  - `DATABASE_URL=<prod_db_url> npm run import:all`
- Data verification:
  - `DATABASE_URL=<prod_db_url> npm run verify:data > verify-prod.json`
  - Check monthly totals and unknown diagnosis counts
