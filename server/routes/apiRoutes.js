const express = require('express');
const multer = require('multer');
const { ok, fail } = require('../utils/response');
const { isValidMonth } = require('../utils/month');
const { processUploadedFile } = require('../services/uploadService');
const { getCategoryThresholds, getCategoryScore } = require('../services/categoryService');

const VALID_DIAGNOSIS_CODES = new Set('ABCDEFGHIJK'.split(''));

function parseDiagnosisCodeCounts(rawCodes, rawCodeCounts) {
  const diagnosisCodeCounts = {};
  let hasInvalid = false;

  if (rawCodeCounts && typeof rawCodeCounts === 'object' && !Array.isArray(rawCodeCounts)) {
    for (const [rawCode, rawCount] of Object.entries(rawCodeCounts)) {
      const code = String(rawCode || '').trim().toUpperCase();
      const numeric = Number(rawCount);
      const count = Number.isFinite(numeric) ? Math.floor(numeric) : NaN;
      if (!VALID_DIAGNOSIS_CODES.has(code)) {
        hasInvalid = true;
        continue;
      }
      if (!Number.isFinite(count) || count <= 0 || !Number.isInteger(count)) {
        hasInvalid = true;
        continue;
      }
      diagnosisCodeCounts[code] = count;
    }
    return { diagnosisCodeCounts, hasInvalid };
  }

  const source = Array.isArray(rawCodes) ? rawCodes : [];
  for (const rawCode of source) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!VALID_DIAGNOSIS_CODES.has(code)) {
      hasInvalid = true;
      continue;
    }
    diagnosisCodeCounts[code] = (diagnosisCodeCounts[code] || 0) + 1;
  }
  return { diagnosisCodeCounts, hasInvalid };
}

function createApiRouter({ db, dbType, reportRepository, generateMonthlyReport }) {
  const router = express.Router();
  const upload = multer({ dest: 'uploads/' });

  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return fail(res, 400, 'NO_FILE', 'No file uploaded.');
      const result = await processUploadedFile(db, req.file);
      return ok(res, { message: 'Upload and parsing successful', ...result });
    } catch (error) {
      console.error(error);
      return fail(res, 500, 'UPLOAD_FAILED', error.message);
    }
  });

  router.post('/upload-multiple', upload.array('files', 100), async (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) return fail(res, 400, 'NO_FILE', 'No files uploaded.');

      const results = [];
      const errors = [];
      for (const file of files) {
        try {
          const result = await processUploadedFile(db, file);
          results.push(result);
        } catch (error) {
          errors.push({ fileName: file.originalname, error: error.message });
        }
      }

      return ok(res, {
        message: `Processed ${files.length} file(s). Success: ${results.length}, Failed: ${errors.length}`,
        successCount: results.length,
        failCount: errors.length,
        results,
        errors,
      });
    } catch (error) {
      console.error(error);
      return fail(res, 500, 'UPLOAD_MULTI_FAILED', error.message);
    }
  });

  router.get('/stats', async (_req, res) => {
    try {
      const daily = await reportRepository.getRecentLogs(30);
      return ok(res, daily);
    } catch (error) {
      return fail(res, 500, 'STATS_FAILED', error.message);
    }
  });

  router.get('/logs', async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize) || 20));

      const [items, total] = await Promise.all([
        reportRepository.getLogsPage(page, pageSize),
        reportRepository.getLogsCount(),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(page, totalPages);

      if (safePage !== page) {
        const safeItems = await reportRepository.getLogsPage(safePage, pageSize);
        return ok(res, { items: safeItems, total, page: safePage, pageSize, totalPages });
      }

      return ok(res, { items, total, page: safePage, pageSize, totalPages });
    } catch (error) {
      return fail(res, 500, 'LOGS_FAILED', error.message);
    }
  });

  router.get('/dashboard', async (req, res) => {
    try {
      const rawMonths = String(req.query.months || '');
      const months = rawMonths.split(',').map((m) => m.trim()).filter((m) => /^\d{4}-\d{2}$/.test(m));
      if (!months.length) return fail(res, 400, 'INVALID_MONTHS', 'No valid months provided.');

      const reports = await reportRepository.getDashboard(months);
      const recentLogs = await reportRepository.getRecentLogs(30);
      return ok(res, { reports, recentLogs }, { months });
    } catch (error) {
      return fail(res, 500, 'DASHBOARD_FAILED', error.message);
    }
  });

  router.get('/category-thresholds', async (_req, res) => {
    try {
      const rows = await getCategoryThresholds(db);
      return ok(res, rows);
    } catch (error) {
      return fail(res, 500, 'CATEGORY_THRESHOLDS_FAILED', error.message);
    }
  });

  router.get('/category-score', async (req, res) => {
    try {
      const today = new Date();
      const defaultEndMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const startMonth = String(req.query.start_month || '2025-09');
      const endMonth = String(req.query.end_month || defaultEndMonth);
      const multiplier = Number(req.query.multiplier ?? 2);

      const data = await getCategoryScore(db, dbType, startMonth, endMonth, multiplier);
      return ok(res, data);
    } catch (error) {
      const status = /Invalid|must be/.test(error.message) ? 400 : 500;
      return fail(res, status, 'CATEGORY_SCORE_FAILED', error.message);
    }
  });

  router.delete('/logs/:date', async (req, res) => {
    try {
      const { date } = req.params;
      await reportRepository.deleteByDate(date);
      return ok(res, { message: 'Data deleted successfully', date });
    } catch (error) {
      return fail(res, 500, 'DELETE_FAILED', error.message);
    }
  });

  router.get('/report/:month', async (req, res) => {
    try {
      const month = req.params.month;
      if (!isValidMonth(month)) return fail(res, 400, 'INVALID_MONTH', 'Invalid month format. Use YYYY-MM.');
      const data = await reportRepository.getMonthlyReport(month);
      return ok(res, data);
    } catch (error) {
      return fail(res, 500, 'REPORT_FAILED', error.message);
    }
  });

  router.put('/cases/classifications', async (req, res) => {
    try {
      const date = String(req.body?.date || '').trim();
      const professorName = String(req.body?.professor_name || '').trim();
      const patientName = String(req.body?.patient_name || '').trim();
      const caseName = String(req.body?.case_name || '').trim();
      const anesthesia = String(req.body?.anesthesia || '').trim();
      const { diagnosisCodeCounts, hasInvalid } = parseDiagnosisCodeCounts(
        req.body?.diagnosis_codes,
        req.body?.diagnosis_code_counts
      );

      if (!date || !professorName || !patientName || !caseName) {
        return fail(res, 400, 'INVALID_PAYLOAD', 'date, professor_name, patient_name, case_name are required.');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return fail(res, 400, 'INVALID_DATE', 'Invalid date format. Use YYYY-MM-DD.');
      }
      if (hasInvalid) {
        return fail(res, 400, 'INVALID_DIAGNOSIS_CODES', 'diagnosis_codes must only contain A~K values.');
      }

      const savedCodes = await reportRepository.setCaseClassifications({
        date,
        professorName,
        patientName,
        caseName,
        anesthesia,
        diagnosisCodeCounts,
      });

      return ok(res, {
        diagnosis_codes: Object.keys(savedCodes).sort(),
        diagnosis_code_counts: savedCodes,
      });
    } catch (error) {
      if (/not found/i.test(error.message)) {
        return fail(res, 404, 'CASE_NOT_FOUND', error.message);
      }
      return fail(res, 500, 'CASE_CLASSIFICATION_SAVE_FAILED', error.message);
    }
  });

  router.put('/cases/classifications/bulk', async (req, res) => {
    try {
      const month = String(req.body?.month || '').trim();
      const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];

      if (!isValidMonth(month)) {
        return fail(res, 400, 'INVALID_MONTH', 'Invalid month format. Use YYYY-MM.');
      }
      if (!rawItems.length) {
        return fail(res, 400, 'INVALID_PAYLOAD', 'items must contain at least one case.');
      }

      const items = [];
      for (const rawItem of rawItems) {
        const date = String(rawItem?.date || '').trim();
        const professorName = String(rawItem?.professor_name || '').trim();
        const patientName = String(rawItem?.patient_name || '').trim();
        const caseName = String(rawItem?.case_name || '').trim();
        const anesthesia = String(rawItem?.anesthesia || '').trim();
        const { diagnosisCodeCounts, hasInvalid } = parseDiagnosisCodeCounts(
          null,
          rawItem?.diagnosis_code_counts
        );

        if (!date || !professorName || !patientName || !caseName) {
          return fail(res, 400, 'INVALID_PAYLOAD', 'Each item requires date, professor_name, patient_name, case_name.');
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return fail(res, 400, 'INVALID_DATE', 'Invalid date format in items. Use YYYY-MM-DD.');
        }
        if (!date.startsWith(`${month}-`)) {
          return fail(res, 400, 'MONTH_MISMATCH', `Item date ${date} is outside month ${month}.`);
        }
        if (hasInvalid) {
          return fail(res, 400, 'INVALID_DIAGNOSIS_CODES', 'diagnosis_code_counts must only contain A~K values.');
        }

        items.push({
          date,
          professorName,
          patientName,
          caseName,
          anesthesia,
          diagnosisCodeCounts,
        });
      }

      const result = await reportRepository.setCaseClassificationsBulk(items);
      return ok(res, { month, saved_count: Number(result?.savedCount || items.length) });
    } catch (error) {
      if (/not found/i.test(error.message)) {
        return fail(res, 404, 'CASE_NOT_FOUND', error.message);
      }
      return fail(res, 500, 'CASE_CLASSIFICATION_BULK_SAVE_FAILED', error.message);
    }
  });

  router.post('/cases/classifications/resync', async (req, res) => {
    try {
      const month = String(req.body?.month || '').trim();
      if (!isValidMonth(month)) {
        return fail(res, 400, 'INVALID_MONTH', 'Invalid month format. Use YYYY-MM.');
      }
      const deletedCount = await reportRepository.clearManualClassificationsByMonth(month);
      return ok(res, { month, deleted_count: deletedCount });
    } catch (error) {
      return fail(res, 500, 'CASE_CLASSIFICATION_RESYNC_FAILED', error.message);
    }
  });

  router.put('/cases/check', async (req, res) => {
    try {
      const date = String(req.body?.date || '').trim();
      const professorName = String(req.body?.professor_name || '').trim();
      const patientName = String(req.body?.patient_name || '').trim();
      const caseName = String(req.body?.case_name || '').trim();
      const anesthesia = String(req.body?.anesthesia || '').trim();
      const isChecked = req.body?.is_checked === true || req.body?.is_checked === 1 || req.body?.is_checked === '1';

      if (!date || !professorName || !patientName || !caseName) {
        return fail(res, 400, 'INVALID_PAYLOAD', 'date, professor_name, patient_name, case_name are required.');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return fail(res, 400, 'INVALID_DATE', 'Invalid date format. Use YYYY-MM-DD.');
      }

      const savedChecked = await reportRepository.setCaseChecked({
        date,
        professorName,
        patientName,
        caseName,
        anesthesia,
        isChecked,
      });
      return ok(res, { is_checked: savedChecked });
    } catch (error) {
      if (/not found/i.test(error.message)) {
        return fail(res, 404, 'CASE_NOT_FOUND', error.message);
      }
      return fail(res, 500, 'CASE_CHECK_SAVE_FAILED', error.message);
    }
  });

  router.get('/cases/:month/:professor', async (req, res) => {
    try {
      const { month, professor } = req.params;
      if (!isValidMonth(month)) return fail(res, 400, 'INVALID_MONTH', 'Invalid month format. Use YYYY-MM.');
      const data = await reportRepository.getCases(month, professor);
      return ok(res, data);
    } catch (error) {
      return fail(res, 500, 'CASES_FAILED', error.message);
    }
  });

  router.get('/export/:month', async (req, res) => {
    try {
      const month = req.params.month;
      if (!isValidMonth(month)) return fail(res, 400, 'INVALID_MONTH', 'Invalid month format. Use YYYY-MM.');

      const { professors, cases, outpatient } = await reportRepository.getExportData(month);
      const workbook = await generateMonthlyReport(month, professors, cases, outpatient);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=Report_${month}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      return fail(res, 500, 'EXPORT_FAILED', error.message);
    }
  });

  return router;
}

module.exports = { createApiRouter };
