const fs = require('fs');
const { parseDailyLog } = require('../parsers/dailyLogParser');

function normalizeDiagnosisCode(rawCode) {
  const text = String(rawCode || '').trim().toUpperCase();
  if (!text || text === 'UNKNOWN' || text === '-') return null;

  const leadingMatch = text.match(/^\s*([A-K])(?:[\s\.\)\]\-:：]|$)/);
  if (leadingMatch) return leadingMatch[1];

  return /^[A-K]$/.test(text) ? text : null;
}

async function processUploadedFile(db, file) {
  let filePath = null;
  let transactionStarted = false;

  try {
    if (!file) throw new Error('No file uploaded.');

    filePath = file.path;
    const { stats, professorStats, professorCases } = parseDailyLog(filePath, file.originalname);
    const dateStr = stats.date;

    await db.exec('BEGIN');
    transactionStarted = true;

    await db.run('DELETE FROM daily_logs WHERE date = ?', [dateStr]);
    await db.run('DELETE FROM professor_stats WHERE date = ?', [dateStr]);
    await db.run('DELETE FROM professor_cases WHERE date = ?', [dateStr]);

    await db.run(
      `INSERT INTO daily_logs (
        date, general_count, local_count, emergency_count,
        main_dept_count, other_dept_count, total_surgery_count,
        admission_count, discharge_count, current_patient_count,
        first_visit_count, re_visit_count, er_first_count, er_suture_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        general_count=excluded.general_count,
        local_count=excluded.local_count,
        emergency_count=excluded.emergency_count,
        main_dept_count=excluded.main_dept_count,
        other_dept_count=excluded.other_dept_count,
        total_surgery_count=excluded.total_surgery_count,
        admission_count=excluded.admission_count,
        discharge_count=excluded.discharge_count,
        current_patient_count=excluded.current_patient_count,
        first_visit_count=excluded.first_visit_count,
        re_visit_count=excluded.re_visit_count,
        er_first_count=excluded.er_first_count,
        er_suture_count=excluded.er_suture_count`,
      [
        stats.date,
        stats.general_count,
        stats.local_count,
        stats.emergency_count,
        stats.main_dept_count,
        stats.other_dept_count,
        stats.total_surgery_count,
        stats.admission_count,
        stats.discharge_count,
        stats.current_patient_count,
        stats.first_visit_count,
        stats.re_visit_count,
        stats.er_first_count,
        stats.er_suture_count,
      ]
    );

    for (const [name, pStats] of Object.entries(professorStats)) {
      await db.run(
        `INSERT INTO professor_stats (
          date, professor_name, general_count, local_count, bpb_count, mac_count, snb_count, fnb_count, spinal_count, admission_count, discharge_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date, professor_name) DO UPDATE SET
          general_count=excluded.general_count,
          local_count=excluded.local_count,
          bpb_count=excluded.bpb_count,
          mac_count=excluded.mac_count,
          snb_count=excluded.snb_count,
          fnb_count=excluded.fnb_count,
          spinal_count=excluded.spinal_count,
          admission_count=excluded.admission_count,
          discharge_count=excluded.discharge_count`,
        [stats.date, name, pStats.general, pStats.local, pStats.bpb, pStats.mac || 0, pStats.snb || 0, pStats.fnb || 0, pStats.spinal || 0, pStats.admission, pStats.discharge]
      );
    }

    for (const c of professorCases) {
      const diagnosisCode = normalizeDiagnosisCode(c.diagnosisCode);
      await db.run(
        `INSERT INTO professor_cases (date, professor_name, patient_name, case_name, anesthesia, diagnosis_code, count)
         VALUES (?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(date, professor_name, patient_name, case_name, anesthesia) DO UPDATE SET
           count = professor_cases.count + 1,
           diagnosis_code = CASE
             WHEN excluded.diagnosis_code IS NULL
               OR TRIM(excluded.diagnosis_code) = ''
               OR UPPER(TRIM(excluded.diagnosis_code)) = 'UNKNOWN'
               OR TRIM(excluded.diagnosis_code) = '-'
             THEN professor_cases.diagnosis_code
             ELSE excluded.diagnosis_code
           END`,
        [stats.date, c.professor, c.patientName, c.caseName, c.anesthesia, diagnosisCode]
      );
    }

    await db.exec('COMMIT');
    transactionStarted = false;
    await fs.promises.unlink(filePath).catch(() => {});
    return { ok: true, date: stats.date, fileName: file.originalname };
  } catch (error) {
    if (transactionStarted) {
      try {
        await db.exec('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    if (filePath) await fs.promises.unlink(filePath).catch(() => {});
    throw error;
  }
}

module.exports = { processUploadedFile };
