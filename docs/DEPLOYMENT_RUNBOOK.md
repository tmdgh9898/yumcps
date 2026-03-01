# Deployment Runbook: Staging -> Production

## 1) Preconditions
- Branches:
  - `staging` for staging deploys
  - `main` for production deploys
- Required secrets/tokens:
  - Render account with access to create 2 DB + 2 services
  - Vercel account with 2 projects
- Local checks:
  - `npm run check:utf8`
  - `npm run build`

## 2) Render setup
- Create staging DB/service from `render.staging.yaml`
- Create production DB/service from `render.production.yaml`
- Set runtime env vars:
  - `PGSSL=true`
  - `CORS_ORIGINS=<stg-web-url>,<prod-web-url>,http://localhost:3000`
- Verify `GET /healthz` returns `{ success: true }`

## 3) Vercel setup
- Staging project: `yumcps-web-stg`
  - Production Branch: `staging`
  - Env: `VITE_API_BASE_URL=<stg-api-url>`
- Production project: `yumcps-web-prod`
  - Production Branch: `main`
  - Env: `VITE_API_BASE_URL=<prod-api-url>`

## 4) Staging rehearsal
- Upload 5-10 sample daily logs from 2025/2026 source folder
- Validate:
  - Upload success and partial failure handling
  - Dashboard aggregates
  - Professor cases endpoint
  - Export xlsx download
  - Delete endpoint
  - UTF-8 Korean text in API + xlsx

## 5) Production cutover
- Merge tested staging commit into `main`
- Confirm prod web points to prod API URL
- Run one-file smoke:
  - `node scripts/smoke-api.js --base=<prod-api-url> --file="<sample xlsx>"`
- Bulk import:
  - `DATABASE_URL=<prod db> npm run import:all`

## 6) Post-cutover verification
- Compare daily/monthly/professor samples against expected values
- Check category score warnings and missing diagnosis handling
- Confirm logs/errors baseline in both platforms

## 7) Hotfix / rollback
- Hotfix branch: `fix/<short-name>`
- Merge to `main` and redeploy
- Rollback by deploying previous known-good commit or `git revert`
