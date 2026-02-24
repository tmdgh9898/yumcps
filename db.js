const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const CATEGORY_THRESHOLDS_SEED = [
    { category_key: 'headneck_congenital', category_label: 'A. 두경부 선천기형', min_for_01: 0, max_for_01: 18, min_for_02: 19, display_order: 1 },
    { category_key: 'headneck_tumor', category_label: 'B. 두경부 종양', min_for_01: 0, max_for_01: 101, min_for_02: 102, display_order: 2 },
    { category_key: 'headneck_trauma_infection_etc', category_label: 'C. 두경부 외상,감염 및 기타', min_for_01: 0, max_for_01: 304, min_for_02: 305, display_order: 3 },
    { category_key: 'breast_trunk_leg_congenital', category_label: 'D. 유방, 체간 및 하지, 선천기형', min_for_01: 0, max_for_01: 4, min_for_02: 5, display_order: 4 },
    { category_key: 'breast_trunk_leg_tumor', category_label: 'E. 유방, 체간 및 하지 종양', min_for_01: 0, max_for_01: 53, min_for_02: 54, display_order: 5 },
    { category_key: 'breast_trunk_leg_trauma_infection_etc', category_label: 'F. 유방, 체간 및 하지 외상, 감염 및 기타', min_for_01: 0, max_for_01: 200, min_for_02: 201, display_order: 6 },
    { category_key: 'hand_upper_congenital', category_label: 'G. 수부 및 상지 선천기형', min_for_01: 0, max_for_01: 1, min_for_02: 2, display_order: 7 },
    { category_key: 'hand_upper_tumor', category_label: 'H. 수부 및 상지 종양', min_for_01: 0, max_for_01: 23, min_for_02: 24, display_order: 8 },
    { category_key: 'hand_upper_trauma_infection_etc', category_label: 'I. 수부 및 상지 외상, 감염 및 기타', min_for_01: 0, max_for_01: 117, min_for_02: 118, display_order: 9 },
    { category_key: 'skin_tumor', category_label: 'J. 피부종양', min_for_01: 0, max_for_01: 132, min_for_02: 133, display_order: 10 },
    { category_key: 'cosmetic', category_label: 'K. 미용', min_for_01: 0, max_for_01: 205, min_for_02: 206, display_order: 11 },
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

async function ensureColumn(db, tableName, columnName, columnTypeSql) {
    const columns = await db.all(`PRAGMA table_info(${tableName})`);
    if (!columns.some(c => c.name === columnName)) {
        await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnTypeSql}`);
    }
}

async function setupDatabase() {
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    // 당직일지 요약 정보 테이블
    await db.exec(`
        CREATE TABLE IF NOT EXISTS daily_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        )
    `);

    // 교수님별 통계 테이블
    await db.exec(`
        CREATE TABLE IF NOT EXISTS professor_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        )
    `);

    // 교수님별 상세 케이스 집계 테이블
    await db.exec(`
        CREATE TABLE IF NOT EXISTS professor_cases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            professor_name TEXT,
            patient_name TEXT,
            case_name TEXT,
            anesthesia TEXT,
            diagnosis_code TEXT,
            count INTEGER DEFAULT 1,
            UNIQUE(date, professor_name, patient_name, case_name, anesthesia)
        )
    `);

    await ensureColumn(db, 'daily_logs', 'er_first_count', 'INTEGER DEFAULT 0');
    await ensureColumn(db, 'daily_logs', 'er_suture_count', 'INTEGER DEFAULT 0');
    await ensureColumn(db, 'professor_cases', 'diagnosis_code', 'TEXT');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS category_score_thresholds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_key TEXT UNIQUE,
            category_label TEXT NOT NULL,
            min_for_01 INTEGER NOT NULL DEFAULT 0,
            max_for_01 INTEGER NOT NULL,
            min_for_02 INTEGER NOT NULL,
            point_01 REAL NOT NULL DEFAULT 0.1,
            point_02 REAL NOT NULL DEFAULT 0.2,
            display_order INTEGER NOT NULL,
            active INTEGER NOT NULL DEFAULT 1
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS diagnosis_category_map (
            diagnosis_code TEXT PRIMARY KEY,
            category_key TEXT NOT NULL
        )
    `);

    for (const t of CATEGORY_THRESHOLDS_SEED) {
        await db.run(`
            INSERT INTO category_score_thresholds (
                category_key, category_label, min_for_01, max_for_01, min_for_02, point_01, point_02, display_order, active
            ) VALUES (?, ?, ?, ?, ?, 0.1, 0.2, ?, 1)
            ON CONFLICT(category_key) DO UPDATE SET
                category_label=excluded.category_label,
                min_for_01=excluded.min_for_01,
                max_for_01=excluded.max_for_01,
                min_for_02=excluded.min_for_02,
                point_01=excluded.point_01,
                point_02=excluded.point_02,
                display_order=excluded.display_order
        `, [t.category_key, t.category_label, t.min_for_01, t.max_for_01, t.min_for_02, t.display_order]);
    }

    for (const m of DIAGNOSIS_CATEGORY_SEED) {
        await db.run(`
            INSERT INTO diagnosis_category_map (diagnosis_code, category_key)
            VALUES (?, ?)
            ON CONFLICT(diagnosis_code) DO UPDATE SET
                category_key=excluded.category_key
        `, [m.diagnosis_code, m.category_key]);
    }

    console.log('Database setup completed.');
    return db;
}

module.exports = { setupDatabase };
