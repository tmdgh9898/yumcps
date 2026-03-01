const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

function arg(name, fallback = '') {
  const token = process.argv.find((v) => v.startsWith(`${name}=`));
  return token ? token.substring(name.length + 1) : fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function getDefaultDirs() {
  const root = process.cwd();
  const dirs = fs.readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => /2025|2026/.test(name));
  return dirs.map((d) => path.join(root, d));
}

function listXlsxFiles(dirs) {
  const files = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isFile() && name.toLowerCase().endsWith('.xlsx')) {
        files.push(full);
      }
    }
  }
  files.sort();
  return files;
}

async function uploadBatch(base, filePaths) {
  const form = new FormData();
  for (const file of filePaths) {
    form.append('files', fs.createReadStream(file), path.basename(file));
  }

  const res = await axios.post(`${base}/api/upload-multiple`, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 120000,
  });
  return res.data;
}

async function uploadSingle(base, filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), path.basename(filePath));
  const res = await axios.post(`${base}/api/upload`, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 120000,
  });
  return res.data;
}

async function main() {
  const base = arg('--base', process.env.API_BASE || '');
  if (!base) throw new Error('missing --base=<https://...> or API_BASE');

  const dirsArg = arg('--dirs', '');
  const batchSize = Math.max(1, Number(arg('--batch-size', '30')) || 30);
  const retryEachFail = hasFlag('--retry-failed');
  const outputDir = arg('--out-dir', path.join(process.cwd(), 'reports'));

  const dirs = dirsArg
    ? dirsArg.split(',').map((v) => v.trim()).filter(Boolean).map((v) => path.resolve(v))
    : getDefaultDirs();

  const files = listXlsxFiles(dirs);
  if (!files.length) throw new Error(`no xlsx files found in: ${dirs.join(', ')}`);

  const batches = chunk(files, batchSize);
  const startedAt = new Date().toISOString();
  const result = {
    base,
    startedAt,
    batchSize,
    sourceDirs: dirs,
    totalFiles: files.length,
    totals: { batchSuccess: 0, batchFail: 0, retrySuccess: 0, retryFail: 0 },
    batches: [],
    failedFiles: [],
  };

  console.log(`[bulk] target=${base}`);
  console.log(`[bulk] files=${files.length}, batches=${batches.length}, batchSize=${batchSize}`);

  for (let i = 0; i < batches.length; i += 1) {
    const filesInBatch = batches[i];
    const label = `${i + 1}/${batches.length}`;
    process.stdout.write(`[bulk] upload batch ${label} (${filesInBatch.length} files) ... `);
    try {
      const data = await uploadBatch(base, filesInBatch);
      const payload = data.data || {};
      const successCount = Number(payload.successCount || 0);
      const failCount = Number(payload.failCount || 0);
      result.totals.batchSuccess += successCount;
      result.totals.batchFail += failCount;
      const failed = (payload.errors || []).map((e) => e.fileName);
      result.failedFiles.push(...failed);
      result.batches.push({
        batch: label,
        requested: filesInBatch.map((v) => path.basename(v)),
        successCount,
        failCount,
        failed,
      });
      console.log(`ok (success=${successCount}, fail=${failCount})`);
    } catch (error) {
      const msg = error?.response?.data || error.message;
      result.batches.push({
        batch: label,
        requested: filesInBatch.map((v) => path.basename(v)),
        successCount: 0,
        failCount: filesInBatch.length,
        failed: filesInBatch.map((v) => path.basename(v)),
        error: typeof msg === 'string' ? msg : JSON.stringify(msg),
      });
      result.failedFiles.push(...filesInBatch.map((v) => path.basename(v)));
      result.totals.batchFail += filesInBatch.length;
      console.log(`fail`);
    }
  }

  if (retryEachFail && result.failedFiles.length) {
    console.log(`[bulk] retry each failed file: ${result.failedFiles.length}`);
    const fileMap = new Map(files.map((f) => [path.basename(f), f]));
    for (const baseName of result.failedFiles) {
      const fullPath = fileMap.get(baseName);
      if (!fullPath) continue;
      try {
        await uploadSingle(base, fullPath);
        result.totals.retrySuccess += 1;
      } catch (_error) {
        result.totals.retryFail += 1;
      }
    }
  }

  result.endedAt = new Date().toISOString();
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const stamp = result.endedAt.replace(/[:.]/g, '-');
  const outPath = path.join(outputDir, `bulk-upload-${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

  console.log(`[bulk] done. report=${outPath}`);
  console.log(`[bulk] batchSuccess=${result.totals.batchSuccess}, batchFail=${result.totals.batchFail}, retrySuccess=${result.totals.retrySuccess}, retryFail=${result.totals.retryFail}`);

  if (result.totals.batchFail > 0 && result.totals.retryFail > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

