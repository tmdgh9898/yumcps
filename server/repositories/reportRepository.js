const { PROFESSORS } = require('../constants/domain');

function monthExpr(dbType, column = 'date') {
  return dbType === 'postgres' ? `substring(${column} from 1 for 7)` : `substr(${column}, 1, 7)`;
}

class ReportRepository {
  constructor(db, dbType) {
    this.db = db;
    this.dbType = dbType;
  }

  async getRecentLogs(limit = 30) {
    return this.db.all('SELECT date, total_surgery_count, admission_count, discharge_count, er_first_count FROM daily_logs ORDER BY date DESC LIMIT ?', [limit]);
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
    return this.db.all(
      `SELECT date, patient_name, case_name, anesthesia, SUM(count) as total_count
       FROM professor_cases
       WHERE date LIKE ? AND professor_name = ?
       GROUP BY date, patient_name, case_name, anesthesia
       ORDER BY date ASC, patient_name ASC`,
      [`${month}%`, professor]
    );
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
