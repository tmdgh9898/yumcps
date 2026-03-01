const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { spawn } = require('child_process');

function arg(name, fallback = '') {
  const token = process.argv.find((v) => v.startsWith(`${name}=`));
  return token ? token.substring(name.length + 1) : fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function main() {
  const base = arg('--base', process.env.API_BASE || 'http://localhost:5000');
  const filePath = arg('--file', '');
  const spawnLocal = hasFlag('--spawn-local');
  let child = null;

  console.log(`[smoke] base=${base}`);

  if (spawnLocal) {
    child = spawn(process.execPath, ['server.js'], {
      stdio: 'ignore',
      detached: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  try {
    let health;
    for (let i = 0; i < 5; i += 1) {
      try {
        health = await axios.get(`${base}/healthz`);
        break;
      } catch (_error) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    if (!health) throw new Error('healthz not reachable');
    if (!health.data?.success) throw new Error('healthz did not return success=true');

    const dashboard = await axios.get(`${base}/api/dashboard`, {
      params: { months: '2025-09,2025-10,2026-01,2026-02' },
    });
    if (!dashboard.data?.success) throw new Error('dashboard response failed');

    if (filePath) {
      const absolute = path.resolve(filePath);
      if (!fs.existsSync(absolute)) throw new Error(`file not found: ${absolute}`);

      const form = new FormData();
      form.append('file', fs.createReadStream(absolute));

      const upload = await axios.post(`${base}/api/upload`, form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (!upload.data?.success) throw new Error('single upload failed');

      const date = upload.data?.data?.date;
      if (!date) throw new Error('upload response missing date');

      const month = String(date).slice(0, 7);
      const report = await axios.get(`${base}/api/report/${month}`);
      if (!report.data?.success) throw new Error('report failed after upload');

      const firstProfessor = report.data?.data?.professors?.[0]?.professor_name;
      if (firstProfessor) {
        const cases = await axios.get(`${base}/api/cases/${month}/${encodeURIComponent(firstProfessor)}`);
        if (!cases.data?.success) throw new Error('cases failed after upload');
      }

      const exportRes = await axios.get(`${base}/api/export/${month}`, { responseType: 'arraybuffer' });
      if (!exportRes.headers['content-type']?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        throw new Error('export content-type mismatch');
      }

      const del = await axios.delete(`${base}/api/logs/${date}`);
      if (!del.data?.success) throw new Error('delete failed');
    }
  } finally {
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
  }

  console.log('[smoke] PASS');
}

main().catch((error) => {
  const detail = error?.response?.data ? JSON.stringify(error.response.data) : (error.stack || error.message);
  console.error('[smoke] FAIL', detail);
  process.exit(1);
});
