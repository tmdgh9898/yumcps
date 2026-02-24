const { setupDatabase: setupSqliteDatabase } = require('../../db');
const { setupPostgresDatabase } = require('./postgres');

async function setupDatabase() {
  const databaseUrl = process.env.DATABASE_URL || '';
  if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
    return setupPostgresDatabase(databaseUrl);
  }
  return setupSqliteDatabase();
}

module.exports = { setupDatabase };
