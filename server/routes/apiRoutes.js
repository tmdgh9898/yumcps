const express = require('express');
const multer = require('multer');
const { ok, fail } = require('../utils/response');
const { isValidMonth } = require('../utils/month');
const { processUploadedFile } = require('../services/uploadService');
const { getCategoryThresholds, getCategoryScore } = require('../services/categoryService');

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
