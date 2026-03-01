const { PROFESSORS } = require('../constants/domain');

function monthExpr(dbType, column = 'date') {
  return dbType === 'postgres' ? `substring(${column} from 1 for 7)` : `substr(${column}, 1, 7)`;
}

const VALID_DIAGNOSIS_CODES = new Set('ABCDEFGHIJK'.split(''));

function normalizeDiagnosisCode(rawCode) {
  const text = String(rawCode || '').trim();
  if (!text) return 'UNKNOWN';

  const upper = text.toUpperCase();
  if (upper === 'UNKNOWN' || upper === '-') return 'UNKNOWN';

  const leadingMatch = upper.match(/^\s*([A-K])(?:[\s\.\)\]\-:：]|$)/);
  if (leadingMatch) return leadingMatch[1];

  const anyMatch = upper.match(/(?:^|[\s\(\[])([A-K])(?:[\s\.\)\]\-:：]|$)/);
  if (anyMatch) return anyMatch[1];

  if (VALID_DIAGNOSIS_CODES.has(upper)) return upper;
  return upper;
}

function normalizeEditableDiagnosisCode(rawCode) {
  const upper = String(rawCode || '').trim().toUpperCase();
  return VALID_DIAGNOSIS_CODES.has(upper) ? upper : null;
}

function normalizeCaseChecked(rawValue) {
  if (rawValue === true || rawValue === 1 || rawValue === '1') return true;
  return false;
}

function buildCaseNaturalKey(row) {
  return [
    String(row.date || ''),
    String(row.professor_name || ''),
    String(row.patient_name || ''),
    String(row.case_name || ''),
    String(row.anesthesia || ''),
  ].join('||');
}

class ReportRepository {
  constructor(db, dbType) {
    this.db = db;
    this.dbType = dbType;
  }

  async getRecentLogs(limit = 30) {
    return this.db.all(
      `SELECT
         dl.date,
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM professor_cases pc_exists
             WHERE pc_exists.date = dl.date
           )
           THEN (
             SELECT COUNT(DISTINCT TRIM(COALESCE(pc.patient_name, '')))
             FROM professor_cases pc
             WHERE pc.date = dl.date
               AND TRIM(COALESCE(pc.patient_name, '')) <> ''
           )
           ELSE 0
         END AS total_surgery_count,
         dl.admission_count,
         dl.discharge_count,
         dl.er_first_count
       FROM daily_logs dl
       ORDER BY dl.date DESC
       LIMIT ?`,
      [limit]
    );
  }

  async getLogsCount() {
    const row = await this.db.get('SELECT COUNT(*) AS total_count FROM daily_logs');
    return Number(row?.total_count || 0);
  }

  async getLogsPage(page = 1, pageSize = 20) {
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 20));
    const offset = (safePage - 1) * safePageSize;

    return this.db.all(
      `SELECT
         dl.date,
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM professor_cases pc_exists
             WHERE pc_exists.date = dl.date
           )
           THEN (
             SELECT COUNT(DISTINCT TRIM(COALESCE(pc.patient_name, '')))
             FROM professor_cases pc
             WHERE pc.date = dl.date
               AND TRIM(COALESCE(pc.patient_name, '')) <> ''
           )
           ELSE 0
         END AS total_surgery_count,
         dl.admission_count,
         dl.discharge_count,
         dl.er_first_count
       FROM daily_logs dl
       ORDER BY dl.date DESC
       LIMIT ? OFFSET ?`,
      [safePageSize, offset]
    );
  }

  async getDashboard(months) {
    const placeholders = months.map(() => '?').join(',');
    const m = monthExpr(this.dbType);

    const professorRows = await this.db.all(
      `SELECT
        ${m} as month,
        professor_name,
        SUM(general_count) as total_general,
        SUM(local_count) as total_local,
        SUM(bpb_count) as total_bpb,
        SUM(mac_count) as total_mac,
        SUM(snb_count) as total_snb,
        SUM(fnb_count) as total_fnb,
        SUM(spinal_count) as total_spinal,
        SUM(admission_count) as total_admission,
        SUM(discharge_count) as total_discharge
      FROM professor_stats
      WHERE ${m} IN (${placeholders})
      GROUP BY ${m}, professor_name`,
      months
    );

    const outpatientRows = await this.db.all(
      `SELECT
        ${m} as month,
        SUM(first_visit_count) as total_first,
        SUM(re_visit_count) as total_re,
        SUM(er_first_count) as total_er_first,
        SUM(er_suture_count) as total_er_suture
      FROM daily_logs
      WHERE ${m} IN (${placeholders})
      GROUP BY ${m}`,
      months
    );

    const professorByMonth = new Map();
    for (const row of professorRows) {
      if (!professorByMonth.has(row.month)) professorByMonth.set(row.month, new Map());
      professorByMonth.get(row.month).set(row.professor_name, row);
    }

    const outpatientByMonth = new Map(outpatientRows.map((row) => [row.month, row]));
    const reports = {};

    for (const month of months) {
      const monthProfessorMap = professorByMonth.get(month) || new Map();
      const sortedProfessors = PROFESSORS.map((name) => monthProfessorMap.get(name) || {
        professor_name: name,
        total_general: 0,
        total_local: 0,
        total_bpb: 0,
        total_mac: 0,
        total_snb: 0,
        total_fnb: 0,
        total_spinal: 0,
        total_admission: 0,
        total_discharge: 0,
      });

      reports[month] = {
        professors: sortedProfessors,
        outpatient: outpatientByMonth.get(month) || {
          total_first: 0,
          total_re: 0,
          total_er_first: 0,
          total_er_suture: 0,
        },
      };
    }

    return reports;
  }

  async deleteByDate(date) {
    await this.db.run('DELETE FROM daily_logs WHERE date = ?', [date]);
    await this.db.run('DELETE FROM professor_stats WHERE date = ?', [date]);
    await this.db.run('DELETE FROM professor_cases WHERE date = ?', [date]);
    await this.db.run('DELETE FROM professor_case_classifications WHERE date = ?', [date]);
    await this.db.run('DELETE FROM professor_case_checks WHERE date = ?', [date]);
  }

  async getMonthlyReport(month) {
    const monthPattern = `${month}%`;
    const professorsList = await this.db.all(
      `SELECT professor_name,
        SUM(general_count) as total_general,
        SUM(local_count) as total_local,
        SUM(bpb_count) as total_bpb,
        SUM(mac_count) as total_mac,
        SUM(snb_count) as total_snb,
        SUM(fnb_count) as total_fnb,
        SUM(spinal_count) as total_spinal,
        SUM(admission_count) as total_admission,
        SUM(discharge_count) as total_discharge
      FROM professor_stats
      WHERE date LIKE ?
      GROUP BY professor_name`,
      [monthPattern]
    );

    const sortedProfessors = PROFESSORS.map((name) => professorsList.find((p) => p.professor_name === name) || {
      professor_name: name,
      total_general: 0,
      total_local: 0,
      total_bpb: 0,
      total_mac: 0,
      total_snb: 0,
      total_fnb: 0,
      total_spinal: 0,
      total_admission: 0,
      total_discharge: 0,
    });

    const outpatient = await this.db.get(
      `SELECT
        SUM(first_visit_count) as total_first,
        SUM(re_visit_count) as total_re,
        SUM(er_first_count) as total_er_first,
        SUM(er_suture_count) as total_er_suture
      FROM daily_logs
      WHERE date LIKE ?`,
      [monthPattern]
    );

    return {
      professors: sortedProfessors,
      outpatient: outpatient || { total_first: 0, total_re: 0, total_er_first: 0, total_er_suture: 0 },
    };
  }

  async getCases(month, professor) {
    const rows = await this.db.all(
      `SELECT
         date,
         professor_name,
         patient_name,
         case_name,
         anesthesia,
         diagnosis_code,
         SUM(count) as total_count
       FROM professor_cases
       WHERE date LIKE ? AND professor_name = ?
       GROUP BY date, professor_name, patient_name, case_name, anesthesia, diagnosis_code
       ORDER BY date ASC, patient_name ASC`,
      [`${month}%`, professor]
    );

    const manualRows = await this.db.all(
      `SELECT
         date,
         professor_name,
         patient_name,
         case_name,
         anesthesia,
         diagnosis_code,
         case_count
       FROM professor_case_classifications
       WHERE date LIKE ? AND professor_name = ?`,
      [`${month}%`, professor]
    );
    const checkRows = await this.db.all(
      `SELECT
         date,
         professor_name,
         patient_name,
         case_name,
         anesthesia,
         is_checked
       FROM professor_case_checks
       WHERE date LIKE ? AND professor_name = ?`,
      [`${month}%`, professor]
    );

    const manualByCaseKey = new Map();
    for (const row of manualRows) {
      const key = buildCaseNaturalKey(row);
      const existing = manualByCaseKey.get(key) || {};
      const normalized = normalizeEditableDiagnosisCode(row.diagnosis_code);
      if (normalized) {
        const count = Math.max(0, Math.floor(Number(row.case_count) || 1));
        existing[normalized] = count > 0 ? count : 1;
      }
      manualByCaseKey.set(key, existing);
    }
    const checkedByCaseKey = new Map();
    for (const row of checkRows) {
      checkedByCaseKey.set(buildCaseNaturalKey(row), normalizeCaseChecked(row.is_checked));
    }

    return rows.map((row) => {
      const manualCounts = manualByCaseKey.get(buildCaseNaturalKey(row)) || {};
      const manualCodes = Object.keys(manualCounts).sort();
      return {
        ...row,
        diagnosis_code: normalizeDiagnosisCode(row.diagnosis_code),
        manual_classifications: manualCodes,
        manual_classification_counts: manualCounts,
        case_checked: !!checkedByCaseKey.get(buildCaseNaturalKey(row)),
      };
    });
  }

  async setCaseChecked({
    date,
    professorName,
    patientName,
    caseName,
    anesthesia,
    isChecked,
  }) {
    const caseRow = await this.db.get(
      `SELECT id
       FROM professor_cases
       WHERE date = ?
         AND professor_name = ?
         AND patient_name = ?
         AND case_name = ?
         AND COALESCE(anesthesia, '') = COALESCE(?, '')
       LIMIT 1`,
      [date, professorName, patientName, caseName, anesthesia]
    );
    if (!caseRow) {
      throw new Error('Target case row not found.');
    }

    await this.db.run(
      `INSERT INTO professor_case_checks (
         date,
         professor_name,
         patient_name,
         case_name,
         anesthesia,
         is_checked,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(date, professor_name, patient_name, case_name, anesthesia)
       DO UPDATE SET
         is_checked = excluded.is_checked,
         updated_at = CURRENT_TIMESTAMP`,
      [date, professorName, patientName, caseName, anesthesia, isChecked ? 1 : 0]
    );

    return !!isChecked;
  }

  async setCaseClassifications({
    date,
    professorName,
    patientName,
    caseName,
    anesthesia,
    diagnosisCodeCounts,
  }) {
    const normalizedCounts = this.normalizeDiagnosisCodeCounts(diagnosisCodeCounts);

    let transactionStarted = false;
    try {
      await this.db.exec('BEGIN');
      transactionStarted = true;
      await this.replaceCaseClassificationsNoTransaction({
        date,
        professorName,
        patientName,
        caseName,
        anesthesia,
        diagnosisCodeCounts: normalizedCounts,
      });
      await this.db.exec('COMMIT');
      transactionStarted = false;
      return normalizedCounts;
    } catch (error) {
      if (transactionStarted) {
        try {
          await this.db.exec('ROLLBACK');
        } catch {
          // Ignore rollback errors.
        }
      }
      throw error;
    }
  }

  async setCaseClassificationsBulk(items = []) {
    let transactionStarted = false;
    try {
      await this.db.exec('BEGIN');
      transactionStarted = true;

      for (const item of items) {
        const normalizedCounts = this.normalizeDiagnosisCodeCounts(item.diagnosisCodeCounts);
        await this.replaceCaseClassificationsNoTransaction({
          date: item.date,
          professorName: item.professorName,
          patientName: item.patientName,
          caseName: item.caseName,
          anesthesia: item.anesthesia,
          diagnosisCodeCounts: normalizedCounts,
        });
      }

      await this.db.exec('COMMIT');
      transactionStarted = false;
      return { savedCount: items.length };
    } catch (error) {
      if (transactionStarted) {
        try {
          await this.db.exec('ROLLBACK');
        } catch {
          // Ignore rollback errors.
        }
      }
      throw error;
    }
  }

  async clearManualClassificationsByMonth(month) {
    const result = await this.db.run(
      'DELETE FROM professor_case_classifications WHERE date LIKE ?',
      [`${month}%`]
    );
    return Number(result?.changes || 0);
  }

  normalizeDiagnosisCodeCounts(diagnosisCodeCounts) {
    const normalizedCounts = {};
    for (const [rawCode, rawCount] of Object.entries(diagnosisCodeCounts || {})) {
      const code = normalizeEditableDiagnosisCode(rawCode);
      const count = Math.max(0, Math.floor(Number(rawCount) || 0));
      if (code && count > 0) {
        normalizedCounts[code] = count;
      }
    }
    return normalizedCounts;
  }

  async replaceCaseClassificationsNoTransaction({
    date,
    professorName,
    patientName,
    caseName,
    anesthesia,
    diagnosisCodeCounts,
  }) {
    const caseRow = await this.db.get(
      `SELECT id
       FROM professor_cases
       WHERE date = ?
         AND professor_name = ?
         AND patient_name = ?
         AND case_name = ?
         AND COALESCE(anesthesia, '') = COALESCE(?, '')
       LIMIT 1`,
      [date, professorName, patientName, caseName, anesthesia]
    );

    if (!caseRow) {
      throw new Error('Target case row not found.');
    }

    await this.db.run(
      `DELETE FROM professor_case_classifications
       WHERE date = ?
         AND professor_name = ?
         AND patient_name = ?
         AND case_name = ?
         AND COALESCE(anesthesia, '') = COALESCE(?, '')`,
      [date, professorName, patientName, caseName, anesthesia]
    );

    for (const [diagnosisCode, caseCount] of Object.entries(diagnosisCodeCounts || {})) {
      await this.db.run(
        `INSERT INTO professor_case_classifications (
           date,
           professor_name,
           patient_name,
           case_name,
           anesthesia,
           diagnosis_code,
           case_count,
           created_at,
           updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(date, professor_name, patient_name, case_name, anesthesia, diagnosis_code)
         DO UPDATE SET
           case_count = excluded.case_count,
           updated_at = CURRENT_TIMESTAMP`,
        [date, professorName, patientName, caseName, anesthesia, diagnosisCode, caseCount]
      );
    }
  }

  async getExportData(month) {
    const monthPattern = `${month}%`;
    const report = await this.getMonthlyReport(month);
    const cases = await this.db.all(
      `SELECT professor_name, case_name, SUM(count) as total_count
       FROM professor_cases
       WHERE date LIKE ?
       GROUP BY professor_name, case_name`,
      [monthPattern]
    );

    return { professors: report.professors, cases, outpatient: report.outpatient };
  }
}

module.exports = { ReportRepository, monthExpr };
