const axios = require('axios');

function arg(name, fallback = '') {
  const token = process.argv.find((v) => v.startsWith(`${name}=`));
  return token ? token.substring(name.length + 1) : fallback;
}

async function check(base, path, expectSuccess = true) {
  const url = `${base}${path}`;
  const res = await axios.get(url, { timeout: 30000 });
  if (expectSuccess && res.data?.success !== true) {
    throw new Error(`${path}: expected success=true`);
  }
  return res.data;
}

async function main() {
  const base = arg('--base', process.env.API_BASE || '');
  if (!base) throw new Error('missing --base=<https://...> or API_BASE');

  const report = {
    base,
    checkedAt: new Date().toISOString(),
    checks: [],
  };

  const health = await check(base, '/healthz', true);
  report.checks.push({ name: 'healthz', ok: true, data: health.data || {} });

  const months = '2025-09,2025-10,2025-11,2025-12,2026-01,2026-02';
  const dashboard = await check(base, `/api/dashboard?months=${encodeURIComponent(months)}`, true);
  const reportMonths = Object.keys(dashboard?.data?.reports || {});
  report.checks.push({ name: 'dashboard', ok: true, months: reportMonths.length });

  const monthlyReport = await check(base, '/api/report/2026-02', true);
  report.checks.push({
    name: 'report-2026-02',
    ok: true,
    professors: (monthlyReport?.data?.professors || []).length,
  });

  const thresholds = await check(base, '/api/category-thresholds', true);
  report.checks.push({
    name: 'category-thresholds',
    ok: true,
    count: (thresholds?.data || []).length,
  });

  const score = await check(base, '/api/category-score?start_month=2025-09&end_month=2026-02&multiplier=2', true);
  report.checks.push({
    name: 'category-score',
    ok: true,
    rows: (score?.data?.rows || []).length,
    warnings: (score?.data?.warnings || []).length,
  });

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

