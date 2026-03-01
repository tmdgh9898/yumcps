const { Pool } = require('pg');

const CATEGORY_THRESHOLDS_SEED = [
  { category_key: 'headneck_congenital', category_label: 'headneck_congenital', min_for_01: 0, max_for_01: 18, min_for_02: 19, display_order: 1 },
  { category_key: 'headneck_tumor', category_label: 'headneck_tumor', min_for_01: 0, max_for_01: 101, min_for_02: 102, display_order: 2 },
  { category_key: 'headneck_trauma_infection_etc', category_label: 'headneck_trauma_infection_etc', min_for_01: 0, max_for_01: 304, min_for_02: 305, display_order: 3 },
  { category_key: 'breast_trunk_leg_congenital', category_label: 'breast_trunk_leg_congenital', min_for_01: 0, max_for_01: 4, min_for_02: 5, display_order: 4 },
  { category_key: 'breast_trunk_leg_tumor', category_label: 'breast_trunk_leg_tumor', min_for_01: 0, max_for_01: 53, min_for_02: 54, display_order: 5 },
  { category_key: 'breast_trunk_leg_trauma_infection_etc', category_label: 'breast_trunk_leg_trauma_infection_etc', min_for_01: 0, max_for_01: 200, min_for_02: 201, display_order: 6 },
  { category_key: 'hand_upper_congenital', category_label: 'hand_upper_congenital', min_for_01: 0, max_for_01: 1, min_for_02: 2, display_order: 7 },
  { category_key: 'hand_upper_tumor', category_label: 'hand_upper_tumor', min_for_01: 0, max_for_01: 23, min_for_02: 24, display_order: 8 },
  { category_key: 'hand_upper_trauma_infection_etc', category_label: 'hand_upper_trauma_infection_etc', min_for_01: 0, max_for_01: 117, min_for_02: 118, display_order: 9 },
  { category_key: 'skin_tumor', category_label: 'skin_tumor', min_for_01: 0, max_for_01: 132, min_for_02: 133, display_order: 10 },
  { category_key: 'cosmetic', category_label: 'cosmetic', min_for_01: 0, max_for_01: 205, min_for_02: 206, display_order: 11 },
];

const DIAGNOSIS_CATEGORY_SEED = [
  { diagnosis_code: 'A', category_key: 'headneck_congenital' },
  { diagnosis_code: 'B', category_key: 'headneck_tumor' },
  { diagnosis_code: 'C', category_key: 'headneck_trauma_infection_etc' },
  { diagnosis_code: 'D', category_key: 'breast_trunk_leg_congenital' },
  { diagnosis_code: 'E', category_key: 'breast_trunk_leg_tumor' },
  { diagnosis_code: 'F', category_key: 'breast_trunk_leg_trauma_infection_etc' },
  { diagnosis_code: 'G', category_key: 'hand_upper_congenital' },
  { diagnosis_code: 'H', category_key: 'hand_upper_tumor' },
  { diagnosis_code: 'I', category_key: 'hand_upper_trauma_infection_etc' },
  { diagnosis_code: 'J', category_key: 'skin_tumor' },
  { diagnosis_code: 'K', category_key: 'cosmetic' },
];

function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

class PostgresAdapter {
  constructor(pool) {
    this.pool = pool;
  }

  async exec(sql) {
    await this.pool.query(sql);
  }

  async run(sql, params = []) {
    const query = convertPlaceholders(sql);
    const result = await this.pool.query(query, params);
    return { changes: result.rowCount };
  }

  async get(sql, params = []) {
    const query = convertPlaceholders(sql);
    const result = await this.pool.query(query, params);
    return result.rows[0] || null;
  }

  async all(sql, params = []) {
    const query = convertPlaceholders(sql);
    const result = await this.pool.query(query, params);
    return result.rows;
  }
}

async function seedData(db) {
  for (const t of CATEGORY_THRESHOLDS_SEED) {
    await db.run(
      `INSERT INTO category_score_thresholds (
        category_key, category_label, min_for_01, max_for_01, min_for_02, point_01, point_02, display_order, active
      ) VALUES (?, ?, ?, ?, ?, 0.1, 0.2, ?, 1)
      ON CONFLICT (category_key) DO UPDATE SET
        category_label = EXCLUDED.category_label,
        min_for_01 = EXCLUDED.min_for_01,
        max_for_01 = EXCLUDED.max_for_01,
        min_for_02 = EXCLUDED.min_for_02,
        point_01 = EXCLUDED.point_01,
        point_02 = EXCLUDED.point_02,
        display_order = EXCLUDED.display_order`,
      [t.category_key, t.category_label, t.min_for_01, t.max_for_01, t.min_for_02, t.display_order]
    );
  }

  for (const m of DIAGNOSIS_CATEGORY_SEED) {
    await db.run(
      `INSERT INTO diagnosis_category_map (diagnosis_code, category_key)
       VALUES (?, ?)
       ON CONFLICT (diagnosis_code) DO UPDATE SET category_key = EXCLUDED.category_key`,
      [m.diagnosis_code, m.category_key]
    );
  }
}

async function setupPostgresDatabase(connectionString) {
  const pool = new Pool({ connectionString, max: 10, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined });
  const db = new PostgresAdapter(pool);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS daily_logs (
      id SERIAL PRIMARY KEY,
      date TEXT UNIQUE,
      general_count INTEGER DEFAULT 0,
      local_count INTEGER DEFAULT 0,
      emergency_count INTEGER DEFAULT 0,
      main_dept_count INTEGER DEFAULT 0,
      other_dept_count INTEGER DEFAULT 0,
      total_surgery_count INTEGER DEFAULT 0,
      admission_count INTEGER DEFAULT 0,
      discharge_count INTEGER DEFAULT 0,
      current_patient_count INTEGER DEFAULT 0,
      first_visit_count INTEGER DEFAULT 0,
      re_visit_count INTEGER DEFAULT 0,
      er_first_count INTEGER DEFAULT 0,
      er_suture_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS professor_stats (
      id SERIAL PRIMARY KEY,
      date TEXT,
      professor_name TEXT,
      general_count INTEGER DEFAULT 0,
      local_count INTEGER DEFAULT 0,
      bpb_count INTEGER DEFAULT 0,
      mac_count INTEGER DEFAULT 0,
      snb_count INTEGER DEFAULT 0,
      fnb_count INTEGER DEFAULT 0,
      spinal_count INTEGER DEFAULT 0,
      admission_count INTEGER DEFAULT 0,
      discharge_count INTEGER DEFAULT 0,
      UNIQUE(date, professor_name)
    );

    CREATE TABLE IF NOT EXISTS professor_cases (
      id SERIAL PRIMARY KEY,
      date TEXT,
      professor_name TEXT,
      patient_name TEXT,
      case_name TEXT,
      anesthesia TEXT,
      diagnosis_code TEXT,
      count INTEGER DEFAULT 1,
      UNIQUE(date, professor_name, patient_name, case_name, anesthesia)
    );

    CREATE TABLE IF NOT EXISTS professor_case_classifications (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      professor_name TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      case_name TEXT NOT NULL,
      anesthesia TEXT,
      diagnosis_code TEXT NOT NULL,
      case_count INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(date, professor_name, patient_name, case_name, anesthesia, diagnosis_code)
    );

    CREATE TABLE IF NOT EXISTS professor_case_checks (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      professor_name TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      case_name TEXT NOT NULL,
      anesthesia TEXT,
      is_checked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(date, professor_name, patient_name, case_name, anesthesia)
    );

    CREATE TABLE IF NOT EXISTS category_score_thresholds (
      id SERIAL PRIMARY KEY,
      category_key TEXT UNIQUE,
      category_label TEXT NOT NULL,
      min_for_01 INTEGER NOT NULL DEFAULT 0,
      max_for_01 INTEGER NOT NULL,
      min_for_02 INTEGER NOT NULL,
      point_01 REAL NOT NULL DEFAULT 0.1,
      point_02 REAL NOT NULL DEFAULT 0.2,
      display_order INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS diagnosis_category_map (
      diagnosis_code TEXT PRIMARY KEY,
      category_key TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);
    CREATE INDEX IF NOT EXISTS idx_professor_stats_date_name ON professor_stats(date, professor_name);
    CREATE INDEX IF NOT EXISTS idx_professor_cases_date_name ON professor_cases(date, professor_name);
    CREATE INDEX IF NOT EXISTS idx_prof_case_classifications_date_prof ON professor_case_classifications(date, professor_name);
    CREATE INDEX IF NOT EXISTS idx_prof_case_checks_date_prof ON professor_case_checks(date, professor_name);

    ALTER TABLE professor_case_classifications
      ADD COLUMN IF NOT EXISTS case_count INTEGER NOT NULL DEFAULT 1;
  `);

  await seedData(db);
  return db;
}

module.exports = { setupPostgresDatabase };
