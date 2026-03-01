const fs = require('fs');
const path = require('path');
const { setupDatabase } = require('../server/db');
const { processUploadedFile } = require('../server/services/uploadService');

async function importDir(db, dir) {
  const fullDir = path.resolve(dir);
  if (!fs.existsSync(fullDir)) {
    console.log(`skip missing dir: ${fullDir}`);
    return { ok: 0, fail: 0 };
  }

  const files = fs.readdirSync(fullDir)
    .filter((name) => name.toLowerCase().endsWith('.xlsx'))
    .map((name) => path.join(fullDir, name))
    .sort();

  let ok = 0;
  let fail = 0;

  for (const filePath of files) {
    const tmpPath = `${filePath}.tmp-upload`;
    fs.copyFileSync(filePath, tmpPath);
    try {
      await processUploadedFile(db, {
        path: tmpPath,
        originalname: path.basename(filePath),
      });
      ok += 1;
      console.log(`ok: ${path.basename(filePath)}`);
    } catch (error) {
      fail += 1;
      console.error(`fail: ${path.basename(filePath)} => ${error.message}`);
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  }

  return { ok, fail };
}

async function main() {
  const db = await setupDatabase();
  const years = ['2025 당직일지', '2026 당직일지'];

  let totalOk = 0;
  let totalFail = 0;

  for (const yearDir of years) {
    const result = await importDir(db, path.join(__dirname, '..', yearDir));
    totalOk += result.ok;
    totalFail += result.fail;
  }

  console.log(`done: ok=${totalOk}, fail=${totalFail}`);
  if (totalFail > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
