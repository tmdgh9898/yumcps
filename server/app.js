const express = require('express');
const cors = require('cors');
const { setupDatabase } = require('./db');
const { createApiRouter } = require('./routes/apiRoutes');
const { ReportRepository } = require('./repositories/reportRepository');
const { generateMonthlyReport } = require('./services/exportService');

function detectDbType() {
  const url = process.env.DATABASE_URL || '';
  return url.startsWith('postgres://') || url.startsWith('postgresql://') ? 'postgres' : 'sqlite';
}

async function createApp() {
  const app = express();
  const rawCorsOrigins = process.env.CORS_ORIGINS || 'http://localhost:3000';
  const allowedOrigins = rawCorsOrigins.split(',').map((v) => v.trim()).filter(Boolean);

  app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
    })
  );

  app.use(express.json());

  const db = await setupDatabase();
  const dbType = detectDbType();
  const reportRepository = new ReportRepository(db, dbType);

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok', dbType }, error: null, meta: {} });
  });

  app.use('/api', createApiRouter({ db, dbType, reportRepository, generateMonthlyReport }));

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: err.message }, meta: {} });
  });

  return app;
}

module.exports = { createApp };
